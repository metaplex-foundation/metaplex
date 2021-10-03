use solana_program::hash::Hash;
use solana_gateway_program::{
    instruction::{add_gatekeeper, issue_vanilla},
    state::{ get_gatekeeper_address_with_seed }
};
use solana_gateway_program::state::get_gateway_token_address_with_seed;

use solana_program_test::{BanksClient, ProgramTest, ProgramTestContext};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signer::keypair::Keypair;
use solana_sdk::transaction::Transaction;
use solana_sdk::signature::Signer;


pub struct GatewayContext<'a> {
    pub banks_client: &'a mut BanksClient,
    pub payer: &'a Keypair,
    pub last_blockhash: &'a Hash,

    pub gatekeeper: Keypair,
    pub gatekeeper_network: Keypair
}
impl<'a> GatewayContext<'a> {
    pub async fn new(mut banks_client: &'a mut BanksClient, payer: &'a Keypair, last_blockhash: &'a Hash) -> GatewayContext<'a> {
        let gatekeeper = Keypair::new();
        let gatekeeper_network = Keypair::new();
        let add_gatekeeper_instruction = add_gatekeeper(
            &payer.pubkey(),
            &gatekeeper.pubkey(),
            &gatekeeper_network.pubkey()
        );

        let transaction = Transaction::new_signed_with_payer(
            &[add_gatekeeper_instruction],
            Some(&payer.pubkey()),
            &[payer, &gatekeeper_network],
            *last_blockhash
        );

        banks_client.process_transaction(transaction).await;

        Self {
            banks_client,
            payer,
            last_blockhash,
            gatekeeper: gatekeeper,
            gatekeeper_network: gatekeeper_network
        }
    }

    pub async fn issue_gateway_token(&mut self, owner: Pubkey) -> Pubkey {
        let (gatekeeper_account, _) = get_gatekeeper_address_with_seed(
            &self.gatekeeper.pubkey(),
            &self.gatekeeper_network.pubkey()
        );

        let issue_gateway_token_instruction = issue_vanilla(
            &self.payer.pubkey(),
            &owner,
            &gatekeeper_account,
            &self.gatekeeper.pubkey(),
            &self.gatekeeper_network.pubkey(),
            None,
            None
        );

        let transaction = Transaction::new_signed_with_payer(
            &[issue_gateway_token_instruction],
            Some(&self.payer.pubkey()),
            &[&self.payer, &self.gatekeeper],
            *self.last_blockhash
        );

        self.banks_client.process_transaction(transaction).await;

        let (gateway_token, _) = get_gateway_token_address_with_seed(
            &owner,
            &None,
            &self.gatekeeper_network.pubkey()
        );

        gateway_token
    }
}
