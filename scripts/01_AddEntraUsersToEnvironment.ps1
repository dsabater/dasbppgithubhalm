param (
    [string]$EnvironmentName,
    [string]$UserName,
    [SecureString]$Password
)

#$connectionhost = "https://admin.services.crm4.dynamics.com"

#$securePassword = ConvertTo-SecureString $Password -ASPlainText -Force  
Add-PowerAppsAccount -Endpoint prod -Username $UserName -Password $Password


# Read users from CSV file
$users = Import-Csv -Path config/EntraUsers.csv -Encoding Unicode -Delimiter ";"

# Loop through users and synchronize with PowerApps environment
foreach ($user in $users) {

    # 1 - Add user to Environment
    Write-Host "User '$($user.DisplayName)' - Add to environment..." -NoNewline
    $result = Add-AdminPowerAppsSyncUser -EnvironmentName $EnvironmentName -PrincipalObjectId $user.ObjectId

    # If result code is 200, then the user was added successfully
    if ($result.Code -eq 200) {
        Write-Host "`e[32m OK`e[0m"
    }
    elseif ($result.Code -eq 400) {
        Write-Host "`e[31m FAIL `e[0m" -NoNewline
        # Create a string with result.Error.message skipping the first 35 characters until the first appearance of string "The tracking Id is"
        $errorString = $result.Error.Message.Substring(32, $result.Error.Message.IndexOf("The tracking Id is") - 35)
        # Parse the errorstring variable into an object
        $errorObject = ConvertFrom-Json $errorString
        $errorText = $errorObject.errors[0].Description
        Write-Host "Error: $errorText" -ForegroundColor White
        continue
    } 
    else {
       Write-Host "`e[31m FAIL `e[0m" -NoNewline
       Write-Host "Unknown Error: $($result.Code)"
       continue
    }
    
}
