import sys, json, datetime

class UploadConfig:
    def __init__(self, output_file):
        self.output_file = output_file

        self.price = 0.01
        self.number = None
        self.gatekeeper = None
        self.gatekeeperNetwork = None
        self.gatekeeperExpireOnUse = False
        self.solTreasuryAccount = None
        self.splTokenAccount = None
        self.splToken = None
        self.goLiveDate = None
        self.endSettings = None
        self.whitelistMintSettings = None
        self.hiddenSettings = None
        self.storage = "arweave"
        self.ipfsInfuraProjectId = None
        self.ipfsInfuraSecret = None
        self.awsS3Bucket = None
        self.noRetainAuthority = False
        self.noMutable = False

    def generate_json(self):
        res = {}
        res["price"] = self.price
        res["number"] = self.number
        if self.gatekeeper:
            res["gatekeeper"] = {
                    "gatekeeperNetwork": self.gatekeeperNetwork,
                    "expireOnUse": self.gatekeeperExpireOnUse
                }
        else:
            res["gatekeeper"] = None
        res["solTreasuryAccount"] = self.solTreasuryAccount
        res["splTokenAccount"] = self.splTokenAccount
        res["splToken"] = self.splToken
        res["goLiveDate"] = self.goLiveDate
        res["endSettings"] = self.endSettings
        res["whitelistMintSettings"] = self.whitelistMintSettings
        res["hiddenSettings"] = self.hiddenSettings
        res["storage"] = self.storage
        res["ipfsInfuraProjectId"] = self.ipfsInfuraProjectId
        res["ipfsInfuraSecret"] = self.ipfsInfuraSecret
        res["awsS3Bucket"] = self.awsS3Bucket
        res["noRetainAuthority"] = self.noRetainAuthority
        res["noMutable"] = self.noMutable
        
        return json.dumps(res)

    def generate_file_config(self):
        with open(self.output_file,'w') as f:
            f.write(self.generate_json())


# Class that manages the user inputs in a secure way
class SecureInput:
    def int_number_input(self, prompt):
        got_input = False
        while not got_input:
            try:
                res = int(input(prompt))
                got_input = True
            except ValueError:
                print("Only integers are allowed.")
        return res

    def float_number_input(self, prompt):
        got_input = False
        while not got_input:
            try:
                res = float(input(prompt))
                got_input = True
            except ValueError:
                print("Only numbers are allowed.")
        return res

    def boolean_input(self, prompt, default=""):
        got_input = False
        if default != "":
            prompt += ("(Y/n) " if default else "(y/N) ")
        while not got_input:
            res = input(prompt).upper()

            if (res == "Y" or res == "N"):
                got_input = True
            elif res == "" and default != "":
                return default
            else:
                print("Y for Yes, N for No")
        return True if res == "Y" else False

    def input_among_choices(self, prompt, choices):
        got_input = False
        n = len(choices)
        while not got_input:
            print(prompt)
            for i, choice in enumerate(choices):
                print(f"{i+1}- {choice}")
            res = int(input(f"Select the option between 1 and {n}: "))

            if (res >= 1 and res <= n):
                got_input = True
            else:
                print("\n")
        return choices[res-1]

    def string_input(self, prompt, default=""):
        got_input = False
        if default != "":
            prompt += f' (Enter for default value "{default}")'
        while not got_input:
            try:
                res = input(prompt)
                got_input = True
            except ValueError:
                print("Please enter a string.")
        return res if res != "" else default

    def date_input(self, prompt):
        got_input = False
        
        while not got_input:
            try:
                res = input(prompt)
                datetime.datetime.strptime(res, '%d %b %Y %H:%M:%S %Z')
                got_input = True
            except ValueError:
                print("Incorrect data format, should be: DD MMM YYYY HH:MM:SS [UTC, GMT]")
                print("Eg: 23 Dec 2021 21:00:00 GMT")


        return res

### Main Part of the Program
if __name__ == "__main__":
    # Display the help for usage
    if (len(sys.argv[1:]) != 0):
        print("help")
        sys.exit(2)
    
    uploadConfig = UploadConfig("config.json")
    secureInput = SecureInput()

    uploadConfig.price = secureInput.float_number_input("At what price do you want to sell an item (in SOL)? ")
    uploadConfig.number = secureInput.int_number_input("How many items do you have in your collection? ")
    
    uploadConfig.gatekeeper = secureInput.boolean_input("Do you want Captcha Settings? ", True)
    if (uploadConfig.gatekeeper):
        uploadConfig.gatekeeperNetwork = secureInput.string_input("Gatekeeper Network address :", "ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6")
        uploadConfig.gatekeeperExpireOnUse = secureInput.boolean_input("Do you want the Captcha to expire on use? ", True)
    
    if (secureInput.boolean_input("Do you want to set a SOL Treasury Account? ")):
        uploadConfig.solTreasuryAccount = secureInput.string_input("Enter your SOL Treasury Account: ")
    elif (secureInput.boolean_input("Do you want to set a SPL Token? ")):
        uploadConfig.splToken = secureInput.string_input("Enter your SPL Token: ")
        uploadConfig.splTokenAccount = secureInput.string_input("Enter your SPL Token Account: ")
        
    uploadConfig.goLiveDate = secureInput.date_input("Enter the mint date: ")

    uploadConfig.endSettings = secureInput.boolean_input("Do you want to set an end settings? ")
    if (uploadConfig.endSettings):
        uploadConfig.endSettings_type = secureInput.input_among_choices("Do you want your mint to end after: ", ["date", "amount"])
        if (uploadConfig.endSettings_type == "date"):
            uploadConfig.endSettings_value = secureInput.date_input("On what date do you want your mint to end: ")
        else:
            uploadConfig.endSettings_value = secureInput.int_number_input("After how many mint do you want your mint to end: ")

    should_consider_hiddenSettings = False if uploadConfig.number < 20000 else True
    uploadConfig.hiddenSettings = secureInput.boolean_input("Do you want to set hidden settings: ", should_consider_hiddenSettings)
    if (uploadConfig.hiddenSettings):
        uploadConfig.hiddenSettings_name = secureInput.string_input("Enter the name: ")
        uploadConfig.hiddenSettings_uri = secureInput.string_input("Enter the uri: ")
        uploadConfig.hiddenSettings_hash = secureInput.string_input("Enter the hash: ")


    uploadConfig.storage = secureInput.input_among_choices("What type of storage do you want to use? ", ["arweave", "aws", "ipfs"])
    if uploadConfig.storage == "aws":
        uploadConfig.storage = secureInput.string_input("Enter your AWS Bucket: ")
    elif uploadConfig.storage == "ipfs":
        uploadConfig.ipfsInfuraProjectId = secureInput.string_input("Enter your IPFS Project ID: ")
        uploadConfig.ipfsInfuraSecret = secureInput.string_input("Enter your IPFS Infura Secret: ")

    uploadConfig.noRetainAuthority = not secureInput.boolean_input("Do you want any Retain Authority? ")
    uploadConfig.noMutable = not secureInput.boolean_input("Do you want your NFTs mutable? ", True)

    
    # Generate the config file
    uploadConfig.generate_file_config()
    