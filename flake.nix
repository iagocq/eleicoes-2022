{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        buildInputs = with pkgs; [ nodejs-18_x nodePackages.npm ];
        nativeBuildInputs = with pkgs; [ ];
      in
      rec {
        devShell = pkgs.mkShell {
          inherit buildInputs nativeBuildInputs;
        };
      });
}
