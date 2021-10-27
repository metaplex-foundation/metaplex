FROM node:14 as builder

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    RUST_VERSION=1.55.0

# install rust
RUN set -eux; \
    dpkgArch="$(dpkg --print-architecture)"; \
    case "${dpkgArch##*-}" in \
        amd64) rustArch='x86_64-unknown-linux-gnu'; rustupSha256='3dc5ef50861ee18657f9db2eeb7392f9c2a6c95c90ab41e45ab4ca71476b4338' ;; \
        armhf) rustArch='armv7-unknown-linux-gnueabihf'; rustupSha256='67777ac3bc17277102f2ed73fd5f14c51f4ca5963adadf7f174adf4ebc38747b' ;; \
        arm64) rustArch='aarch64-unknown-linux-gnu'; rustupSha256='32a1532f7cef072a667bac53f1a5542c99666c4071af0c9549795bbdb2069ec1' ;; \
        i386) rustArch='i686-unknown-linux-gnu'; rustupSha256='e50d1deb99048bc5782a0200aa33e4eea70747d49dffdc9d06812fd22a372515' ;; \
        *) echo >&2 "unsupported architecture: ${dpkgArch}"; exit 1 ;; \
    esac; \
    url="https://static.rust-lang.org/rustup/archive/1.24.3/${rustArch}/rustup-init"; \
    wget "$url"; \
    echo "${rustupSha256} *rustup-init" | sha256sum -c -; \
    chmod +x rustup-init; \
    ./rustup-init -y --no-modify-path --profile minimal --default-toolchain $RUST_VERSION --default-host ${rustArch}; \
    rm rustup-init; \
    chmod -R a+w $RUSTUP_HOME $CARGO_HOME; \
    rustup --version; \
    cargo --version; \
    rustc --version;

WORKDIR /app

# copy files
COPY packages/graphql/package.json /app
COPY packages/graphql/tsconfig.json /app
COPY yarn.lock /app

COPY packages/graphql/src /app/src
COPY packages/graphql/ingester /app/ingester

# install
RUN yarn
RUN npm install -g rimraf

# build
RUN yarn build:ts
RUN yarn build:native

# final image
FROM node:14
ENV NODE_ENV=production
WORKDIR /app
COPY packages/graphql/package.json /app
COPY yarn.lock /app
COPY --from=builder /app/ingester/index.node /app/ingester/index.node
COPY --from=builder /app/ingester/index.js /app/ingester/index.js
COPY --from=builder /app/ingester/target /app/ingester/target
COPY --from=builder /app/dist /app/dist
RUN yarn --prod
CMD ["node", "/app/dist/bin/metaplex.js"]
