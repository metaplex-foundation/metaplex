import { execSync } from 'child_process';
import path from 'path';

async function build() {
  const programs: string[] = [
    'auction/program',
    'token-metadata/program',
    'token-vault/program',
    'metaplex/program',
  ];

  const currentDir = process.cwd();

  programs.forEach((directory) => {
    const dir = path.resolve(currentDir, `../../${directory}`);
    process.chdir(dir);
    execSync(`cargo build-bpf`);
  });

  process.chdir(currentDir);
}

build();
