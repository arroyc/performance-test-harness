#! /bin/bash
echo '{"result": "Ok"}' > ~/data/post.json
echo "Ran post.sh"
exit_code=$?

if [[ $exit_code != 0 ]]; then
    status='Failure'
    exit 1
fi
exit 0
