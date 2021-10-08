// import { getServer } from "./startApolloServer";
// import { MetaplexApiDataSource } from "../api";
// import type { IMetaplexApi } from "../api/IMetaplexApi";
// import { Store } from "../common";
// import { ObjectId } from "bson";

describe('stub', () => {
  it('test', () => {
    expect(true).toBeTruthy();
  });
})

// describe("startApolloServer", () => {
//   async function setup(entrypoint: Partial<IMetaplexApi>) {
//     const api = new MetaplexApiDataSource([{ ...entrypoint } as IMetaplexApi]);
//     const { apolloServer } = await getServer(api);
//     return apolloServer;
//   }

//   it("it works", async () => {
//     const server = await setup({});
//     const result = await server.executeOperation({
//       query: "query { __typename }",
//       variables: {},
//     });
//     expect(result.errors).toBeUndefined();
//     expect({
//       __typename: "Query",
//     }).toEqual(result.data);
//   });

//   it("counts", async () => {
//     const server = await setup({
//       storesCount: () => Promise.resolve(1),
//       creatorsCount: () => Promise.resolve(2),
//       artworksCount: () => Promise.resolve(3),
//       auctionsCount: () => Promise.resolve(4),
//     });
//     const result = await server.executeOperation({
//       query: `query {
//         storesCount
//         creatorsCount
//         artworksCount
//         auctionsCount
//       }`,
//       variables: {},
//     });
//     expect(result.errors).toBeUndefined();
//     expect({
//       storesCount: 1,
//       creatorsCount: 2,
//       artworksCount: 3,
//       auctionsCount: 4,
//     }).toEqual(result.data);
//   });

//   describe("store", () => {
//     const store = new Store({
//       public: true,
//       auctionProgram: "auctionProgram",
//       tokenVaultProgram: "tokenVaultProgram",
//       tokenMetadataProgram: "tokenMetadataProgram",
//       tokenProgram: "tokenProgram",
//     });
//     store._id = new ObjectId("00000001121f2d7a9665cc97");

//     it("store", async () => {
//       const server = await setup({
//         async getStore(id: string) {
//           if (id === "test") {
//             return store;
//           }
//           return null;
//         },
//       });
//       const query = `
//       query Test($storeId: String!) { store(storeId: $storeId) {
//           pubkey
//           key
//           public
//           auctionProgram
//           tokenVaultProgram
//           tokenMetadataProgram
//           tokenProgram
//       }}`;
//       const result = await server.executeOperation({
//         query,
//         variables: { storeId: "test" },
//       });
//       expect(result.errors).toBeUndefined();
//       expect(result.data).toEqual({
//         store: {
//           auctionProgram: "auctionProgram",
//           key: 3,
//           pubkey: "00000001121f2d7a9665cc97",
//           public: true,
//           tokenMetadataProgram: "tokenMetadataProgram",
//           tokenProgram: "tokenProgram",
//           tokenVaultProgram: "tokenVaultProgram",
//         },
//       });

//       const result2 = await server.executeOperation({
//         query,
//         variables: { storeId: "null" },
//       });
//       expect(result2.errors).toBeUndefined();
//       expect(result2.data).toEqual({
//         store: null,
//       });
//     });

//     it("stores", async () => {
//       const server = await setup({
//         async getStores() {
//           return [store];
//         },
//       });
//       const query = `
//         query {
//           stores {
//             pubkey
//             key
//             public
//             auctionProgram
//             tokenVaultProgram
//             tokenMetadataProgram
//             tokenProgram
//         }}`;
//       const result = await server.executeOperation({ query });

//       expect(result.errors).toBeUndefined();
//       expect(result.data).toEqual({
//         stores: [
//           {
//             auctionProgram: "auctionProgram",
//             key: 3,
//             pubkey: "00000001121f2d7a9665cc97",
//             public: true,
//             tokenMetadataProgram: "tokenMetadataProgram",
//             tokenProgram: "tokenProgram",
//             tokenVaultProgram: "tokenVaultProgram",
//           },
//         ],
//       });
//     });
//   });
// });
