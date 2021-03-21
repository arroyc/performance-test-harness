import time
import hmac
import hashlib
import base64
import sys
import argparse
from urllib.parse import quote_plus, urlencode

def _sign_string(uri, key_name, key):
    """Generate SAS token string
    """
    # 365 * 60 * 60 * 24 - Year
    expiry = int(time.time() + 365 * 60 * 60 * 24)
    string_to_sign = quote_plus(uri) + '\n' + str(expiry)

    key = key.encode('utf-8')
    string_to_sign = string_to_sign.encode('utf-8')
    signed_hmac_sha256 = hmac.HMAC(key, string_to_sign, hashlib.sha256)
    signature = signed_hmac_sha256.digest()
    signature = base64.b64encode(signature)

    return 'SharedAccessSignature (add the required prefix wherever needed) - sr=' + quote_plus(uri)  + '&sig=' + quote_plus(signature) + '&se=' + str(expiry) + '&skn=' + key_name


def main():
    uri = ""
    policy_name = ""
    policy_key = ""

    try:
        parser = argparse.ArgumentParser(description="Generate SAS token.")
        parser.add_argument("--uri", type=str)
        parser.add_argument("--policy-name", type=str)
        parser.add_argument("--policy-key", type=str)
        args = parser.parse_args()
    except Exception:
        sys.exit(2)
        
    uri = args.uri
    policy_name = args.policy_name
    policy_key = args.policy_key

    print(_sign_string(uri, policy_name, policy_key))


if __name__ == '__main__':
    main()
