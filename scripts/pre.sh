#! /bin/bash
sudo sh -c "apt-get install --yes jq"

for s in $(cat /home/adminuser/data/testconfig.json | jq '.test_env_vars' | jq -r -c "to_entries|.[]"); do
    key=$(echo $s | jq -r '.key')
    value=$(echo $s | jq -r '.value')
    echo "export ${key}=\"${value}\"" >> /home/adminuser/data/test_env_var_exports.sh
done

sudo sh -c "mv /home/adminuser/data/test_env_var_exports.sh /etc/profile.d/test_env_var_exports.sh"
sudo sh -c "chown root:root /etc/profile.d/test_env_var_exports.sh"
sudo sh -c "chmod 644 /etc/profile.d/test_env_var_exports.sh"

# pre.sh must return an exit code to signal success or failure to the pipelines
exit_code=$?

if [[ $exit_code != 0 ]]; then
    status='Failure'
    exit 1
fi
exit 0