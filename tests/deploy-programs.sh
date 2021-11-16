DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

ROOT=$DIR/..

programs=(
  auction/program
  token-metadata/program
  token-vault/program
  metaplex/program
)

deployables=(
  metaplex_auction
  metaplex_token_metadata
  metaplex_token_vault
  metaplex
)

for prog in "${programs[@]}"; do
    cd "$ROOT/rust/$prog"
    cargo build-bpf
done


for dep in "${deployables[@]}"; do
  SOFILE="$ROOT/rust/target/deploy/$dep.so"
  solana program deploy $SOFILE
done
