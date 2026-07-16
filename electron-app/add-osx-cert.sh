#!/usr/bin/env sh

set -eu

KEY_CHAIN=build.keychain
CERTIFICATE_P12=certificate.p12

# Recreate the certificate from the secure environment variable
echo "$CERTIFICATE_OSX_APPLICATION_BASE64" | base64 --decode > "$CERTIFICATE_P12"

#create a keychain
security create-keychain -p actions "$KEY_CHAIN"

# Make the keychain the default so identities are found
security default-keychain -s "$KEY_CHAIN"
security list-keychains -d user -s "$KEY_CHAIN" login.keychain

# Unlock the keychain
security unlock-keychain -p actions "$KEY_CHAIN"

security import "$CERTIFICATE_P12" -k "$KEY_CHAIN" -P "$CERTIFICATE_OSX_PASSWORD" -T /usr/bin/codesign

security set-key-partition-list -S apple-tool:,apple: -s -k actions "$KEY_CHAIN"
security find-identity -v -p codesigning "$KEY_CHAIN"

# remove certs
rm -f *.p12