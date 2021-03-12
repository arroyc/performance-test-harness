#! /bin/bash

###########################################
# Parameters
# $1 - project dir name
# $2 - script name
# $3 - function uri
# $4 - function key
# $5 - test build id
# $6 - job attempt id
# $7 - vm agent name

declare status='Success'

pushd ~/${1}/scripts > /dev/null 2>&1
bash -c "source /etc/profile && ./${2}.sh -b ${5} -j ${6} > ~/data/${2}.out 2>&1"
exit_code=$?

if [[ $exit_code != 0 ]]; then 
    status='Failure'
fi

bash -c "./callback.sh -u ${3} -k ${4} -b ${5} -a ${6} -v ${7} -s ${status} -t 'Callback resolved.' -n '${2}' -d > ~/data/${2}-callback.out 2>&1"
popd > dev/null 2>&1