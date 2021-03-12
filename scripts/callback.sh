#!/bin/bash
me=`basename "$0"`

#--------------------------------------------------------------
# Utility Functions
#--------------------------------------------------------------
_debug() {
    #Only print debug lines if debugging is turned on.
    if [ "$DEBUG_FLAG" == true ]; then
        msg="$@"
        LIGHT_CYAN='\033[0;35m'
        NC='\033[0m'
        printf "DEBUG: ${NC} %s ${NC}\n" "${msg}"
    fi
}

_error() {
    printf "\e[31mERROR: $@\n\e[0m"
}

_information() {
    printf "\e[36m$@\n\e[0m"
}

_success() {
    printf "\e[32m$@\n\e[0m"
}

usage() {
    _helpText="    Usage: $me
        -u | --uri <function uri>. 
        -k | --key <function key>.
        -b | --buildid <pipeline build id>. 
        -a | --attemptid <pipeline job attempt id>. 
        -v | --vmname <name of agent vm>. 
        -s | --status <result of test>. 
        -t | --testresult <test result data (base64 encoded)>.  
        -n | --taskname <name of the script that is part of container name on storage account>.     
        -d | --debug Turn debug logging on
        -h | --help Show the usuage help (this.)"
        
    _information "$_helpText" 1>&2
    exit 1
}
#--------------------------------------------------------------
# Script Parameters
#--------------------------------------------------------------
declare URI=""
declare KEY=""
declare BUILDID=""
declare ATTEMPTID=""
declare VMNAME=""
declare STATUS=""
declare TESTRESULT=""
declare TASKNAME=""
declare OUTPUT_FILE_DIR='~/data/'
declare DEBUG_FLAG=false

# Initialize parameters specified from command line
while [[ "$#" -gt 0 ]]
do
  case $1 in
    -u | --uri )
        URI=$2
        ;;  
    -k | --key )
        KEY=$2
        ;;  
    -b | --buildid )
        BUILDID=${2}
        ;;  
    -a | --attemptid )
        ATTEMPTID=${2}
        ;;  
    -v | --vmname )
        VMNAME=${2}
        ;;  
    -s | --status )
        STATUS=${2}
        ;;  
    -t | --testresult )
        TESTRESULT=${2}
        ;;  
    -n | --taskname )
        TASKNAME=${2}
        ;;  
    -h | --help)
        usage
        exit 0
        ;;
    -d | --debug )             
        DEBUG_FLAG=true
        ;;         
  esac  
  shift
done

_debug "URI: ${URI}"
_debug "KEY: ${KEY}"

# PAYLOAD=$(cat <<EOF
# {"AzDoBuildId": "11361","AzDoJobAttemptId": "1","VMName": "vm-agents-1-gxqen","Status": "Success","TestResults": "here is the test results for VM2..."}
# EOF
# )

request_uri=${URI}'/UploadAgentResultAsync?code='${KEY}

_debug "REQUEST_URI: $request_uri"

PAYLOAD=$(cat "template.payload.json" \
    | sed 's~__BUILDID__~'"${BUILDID}"'~' \
    | sed 's~__ATTEMPTID__~'"${ATTEMPTID}"'~'  \
    | sed 's~__VMNAME__~'"${VMNAME}"'~'  \
    | sed 's~__STATUS__~'"${STATUS}"'~'  \
    | sed 's~__TESTRESULTS__~'"${TESTRESULT}"'~' \
    | sed 's~__TASKNAME__~'"${TASKNAME}"'~' )

curl -v --location --header 'Content-Type: application/json; charset=utf-8' \
 --request POST ${request_uri} \
 --data-raw "${PAYLOAD}" \
 --compressed

echo "Ran callback.sh"
