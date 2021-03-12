#! /bin/bash
#--------------------------------------------------------------
# Script Parameters
#--------------------------------------------------------------
declare BUILDID="__BUILDID__"
declare DEBUG_FLAG=false

# Initialize parameters specified from command line
while [[ "$#" -gt 0 ]]
do
  case $1 in
    -b | --buildId )
        BUILDID=$2
        ;;  
    -d | --debug )             
        DEBUG_FLAG=true
        ;;         
  esac  
  shift
done

echo $BUILDID
echo "K6 Load:" $input_stages 

# Construct K6 Tags from testconfig.json
k6TagList=""
for s in $(cat /home/adminuser/data/testconfig.json | jq '.test_tags' | jq -r "to_entries|map(\"\(.key)=\(.value|tostring)\")|.[]" ); do
    echo $s
    k6TagList+="--tag $s "
done
k6TagList+="--tag run_id=$BUILDID"
echo $k6TagList

# Parse path of K6 test script
testScriptPath=`cat /home/adminuser/data/testconfig.json | jq -r '.test_path'`

# Prepare the summary export file
touch /home/adminuser/data/${BUILDID}-output.json
chmod 644 ~/data/${BUILDID}-output.json

# Prepare the test load input - this will tell k6 how much load it should generate
input_stages=$(cat /home/adminuser/data/testconfig.json | jq -r '.test_load')
export INPUT_STAGES=$input_stages

# Construct K6 command and verify
echo "K6 Command Prepped: " k6 run ${k6TagList} --out eventhubs --summary-export=~/data/${BUILDID}-output.json --summary-time-unit ms ${testScriptPath}

# Set ulimit
ulimit -n 250000

# Run K6 Command
k6 run ${k6TagList} --out eventhubs --summary-export=/home/adminuser/data/${BUILDID}-output.json --summary-time-unit ms ${testScriptPath}

# executeTest.sh must return an exit code to signal success or failure to the pipelines
exit_code=$?
echo "Ran ExecuteTest.sh"

if [[ $exit_code != 0 ]]; then
    status='Failure'
    exit 1
fi
exit 0