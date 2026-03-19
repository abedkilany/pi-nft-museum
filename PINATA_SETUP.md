Pinata setup

This project uploads image files to Pinata/IPFS automatically when one of these environment variables is set:
- PINATA_JWT
- pinata_jwt

Optional gateway variable:
- PINATA_GATEWAY_URL
- pinata_gateway_url

If no Pinata JWT is found, the project falls back to local uploads.
