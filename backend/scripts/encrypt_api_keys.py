"""One-shot migration: encrypt the provider API keys already stored in Mongo.

Before `core.crypto`, a user's key sat on their document as plaintext `api_key`.
This moves each one into `api_key_encrypted` and removes the plaintext field,
so no readable key is left behind in the collection.

Safe to run more than once: a user whose key is already encrypted is skipped,
and a user with no key is left alone. It reads the same `.env` the app does.

    cd backend && poetry run python scripts/encrypt_api_keys.py --dry-run
    cd backend && poetry run python scripts/encrypt_api_keys.py
"""

import argparse
import sys

from pymongo import MongoClient

from app.core.config import settings
from app.core.crypto import encrypt_secret, is_encrypted
from app.models.user import COLLECTION


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing anything.",
    )
    args = parser.parse_args()

    encrypted = skipped = cleared = 0

    with MongoClient(settings.mongodb_uri) as mongo:
        users = mongo[settings.mongodb_db][COLLECTION]
        # Only documents that still carry the old field are of interest.
        for document in users.find({"api_key": {"$exists": True}}):
            user_id = document["_id"]
            stored = document.get("api_key")

            if not stored:
                # The field exists but holds nothing: drop it, nothing to move.
                cleared += 1
                if not args.dry_run:
                    users.update_one({"_id": user_id}, {"$unset": {"api_key": ""}})
                continue

            if is_encrypted(stored) or is_encrypted(document.get("api_key_encrypted")):
                skipped += 1
                if not args.dry_run:
                    users.update_one({"_id": user_id}, {"$unset": {"api_key": ""}})
                continue

            encrypted += 1
            if not args.dry_run:
                users.update_one(
                    {"_id": user_id},
                    {
                        "$set": {
                            "api_key_encrypted": encrypt_secret(
                                stored, context=str(user_id)
                            )
                        },
                        "$unset": {"api_key": ""},
                    },
                )

        remaining = users.count_documents({"api_key": {"$exists": True}})

    verb = "would encrypt" if args.dry_run else "encrypted"
    print(f"{verb}: {encrypted}")
    print(f"already encrypted, plaintext field dropped: {skipped}")
    print(f"empty key field dropped: {cleared}")
    print(f"documents still carrying a plaintext `api_key` field: {remaining}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
