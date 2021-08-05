import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import dynamic from 'next/dynamic';
import { preloadMeta } from '../contexts/meta/preloadMeta';

const CreateReactAppEntryPoint = dynamic(() => import('../App'), {
  ssr: false,
});

export default function App({
  accounts,
}: InferGetServerSidePropsType<typeof serverPropsGetter>) {
  return <CreateReactAppEntryPoint accounts={accounts} />;
}

const serverPropsGetter: GetServerSideProps = async () => {
  const accounts = await preloadMeta();

  return {
    props: {
      accounts,
    },
    revalidate: 60,
  };
};

export const getStaticProps = process.env.SKIP_SSR ? undefined : serverPropsGetter
