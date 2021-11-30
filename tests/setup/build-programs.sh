DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

ROOT=$DIR/../..

programs=(
  auction/program
  token-metadata/program
  token-vault/program
  metaplex/program
)

for prog in "${programs[@]}"; do
  echo "Building $prog"  
  cd "$ROOT/rust/$prog"
  cargo build-bpf
done
