with import <nixpkgs> {};

stdenv.mkDerivation {
    name = "node";
    buildInputs = [
        yarn
        nodejs-14_x
    ];
    shellHook = ''
        export PATH="$PWD/node_modules/.bin/:$PATH"
    '';
}
