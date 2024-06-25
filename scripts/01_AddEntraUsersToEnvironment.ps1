param (
    [string]$EnvironmentName
)

# Read users from CSV file
$users = Import-Csv -Path config/EntraUsers.csv -Encoding Unicode -Delimiter ";"

# Loop through users and synchronize with PowerApps environment
foreach ($user in $users) {

    Write-Host "User '$($user.DisplayName)' - START" -ForegroundColor White
    # 1 - Add user to Environment
    Write-Host "User '$($user.DisplayName)' - Add to environment..." -NoNewline -ForegroundColor White
    $result = Add-AdminPowerAppsSyncUser -EnvironmentName $EnvironmentName -PrincipalObjectId $user.ObjectId

    # If result code is 200, then the user was added successfully
    if ($result.Code -eq 200) {
        Write-Host "User '$($user.DisplayName)' - START" -ForegroundColor White
    } elseif ($result.Code -eq 400) {
        Write-Host "FAIL " -ForegroundColor Red -NoNewline
        # Create a string with result.Error.message skipping the first 35 characters until the first appearance of string "The tracking Id is"
        $errorString = $result.Error.Message.Substring(32, $result.Error.Message.IndexOf("The tracking Id is") - 35)
        # Parse the errorstring variable into an object
        $errorObject = ConvertFrom-Json $errorString
        $errorText = $errorObject.errors[0].Description
        Write-Host "Error: $errorText" -ForegroundColor White
    } else {
       Write-Host "FAIL " -ForegroundColor Red -NoNewline
       Write-Host "Unknown Error: $($result.Code)" -ForegroundColor Yellow
       continue
    }
    
}
