import { useEffect, useState } from 'react';
import EventEmitter from 'event-emitter';
import unfetch from 'isomorphic-unfetch';
import { Sema } from 'async-sema';
import loadMagicLink from './loadMagicLink';
import { useConnectionConfig } from '@oyster/common';

const tokenSema = new Sema(1);
const loggedInSema = new Sema(1);
const loginEvents = new EventEmitter();

const ONE_MINUTE = 1000 * 60;

let currentLoginState = null;
let currentToken = null;
let magic = null;

if (typeof window !== 'undefined') {
  loadMagicLink();
}

async function getMagicToken(magicLinkKey, endpoint) {
  await tokenSema.acquire();
  try {
    if (currentToken && currentToken.expiredAt > Date.now()) {
      return currentToken.token;
    }

    magic = await loadMagicLink(magicLinkKey, endpoint);
    const token = await magic.user.getIdToken();
    setToken(token);
    return token;
  } finally {
    tokenSema.release();
  }
}

async function isLoggedIn(magicLinkKey, endpoint) {
  await loggedInSema.acquire();

  try {
    if (currentLoginState !== null) {
      return currentLoginState;
    }

    await getMagicToken(magicLinkKey, endpoint);
    currentLoginState = true;
  } catch (err) {
    currentLoginState = false;
  } finally {
    loggedInSema.release();
  }

  return currentLoginState;
}

function setToken(token, lifespan = ONE_MINUTE * 15) {
  currentToken = {
    token,
    expiredAt: Date.now() + lifespan - ONE_MINUTE,
  };
}

export default function useMagicLink() {
  const magicLinkKey = process.env.NEXT_PUBLIC_MAGICLINK_KEY;
  if (!magicLinkKey) {
    throw new Error('Magic Link publishableKey required');
  }

  const { endpoint } = useConnectionConfig();

  const [loggedIn, setLoggedIn] = useState(
    currentLoginState !== null ? currentLoginState : false,
  );
  const [loading, setLoading] = useState(currentLoginState === null);
  const [error, setError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function login(email) {
    setError(null);
    setLoggingIn(true);

    try {
      const magic = await loadMagicLink(magicLinkKey, endpoint);
      const token = await magic.auth.loginWithMagicLink({ email });
      currentLoginState = true;
      setToken(token);
      loginEvents.emit('loggedIn', true);
      setLoggedIn(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    setError(null);
    setLoggingOut(true);

    try {
      const magic = await loadMagicLink(magicLinkKey, endpoint);
      await magic.user.logout();
      currentLoginState = null;
      currentToken = null;
      loginEvents.emit('loggedIn', false);
      setLoggedIn(false);
    } catch (err) {
      setError(err);
    } finally {
      setLoggingOut(false);
    }

    return currentLoginState === null;
  }

  async function fetch(url, opts = {}) {
    const token = await getMagicToken(magicLinkKey, endpoint);
    if (token) {
      opts.headers = opts.headers || {};
      opts.headers.Authorization = `Bearer ${token}`;
    }

    return unfetch(url, opts);
  }

  useEffect(() => {
    if (!currentLoginState) {
      isLoggedIn(magicLinkKey, endpoint)
        .then(loginState => {
          setLoggedIn(loginState);
        })
        .then(() => setLoading(false));
    }

    function watchLoggedIn(state) {
      setLoggedIn(state);
    }

    loginEvents.on('loggedIn', watchLoggedIn);

    return () => {
      loginEvents.off('loggedIn', watchLoggedIn);
    };
  }, [currentLoginState]);

  return {
    loggedIn,
    loading,
    error,
    loggingIn,
    loggingOut,
    login,
    logout,
    fetch,
    loginEvents,
    magic,
  };
}
