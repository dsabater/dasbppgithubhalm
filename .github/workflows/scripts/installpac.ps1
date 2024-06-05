
Write-Host "Agent.OS = $env:AGENT_OS"
$packageId = switch ($env:AGENT_OS) {
    "Linux" { "Microsoft.PowerApps.CLI.Core.linux-x64" }
    "macOS" { "Microsoft.PowerApps.CLI.Core.osx-x64" }
    "Windows" { "Microsoft.PowerApps.CLI" }
}
Write-Host "Downloading pac $packageId"
  
$id = $packageId.ToLower()
$packageInfo = Invoke-RestMethod `
    "https://api.nuget.org/v3/registration5-semver1/$id/index.json"
$version = $packageInfo.items[0].upper
Write-Host "Latest version: $version"

Invoke-WebRequest `
    -Uri "https://api.nuget.org/v3-flatcontainer/$id/$version/$id.$version.nupkg" `
    -OutFile "$env:AGENT_TEMPDIRECTORY/$packageId.nupkg"
Write-Host "Downloaded $packageId.nupkg"

Expand-Archive `
    "$env:AGENT_TEMPDIRECTORY/$packageId.nupkg" `
    "$env:AGENT_TEMPDIRECTORY/$packageId"
Write-Host "Extracted to $packageId"

Copy-Item `
    "$env:AGENT_TEMPDIRECTORY/$packageId/tools" `
    "$env:AGENT_TOOLSDIRECTORY/Microsoft.PowerApps.CLI" `
    -Recurse

Write-Host "PATH=$env:PATH"
Write-Host "##vso[task.setvariable variable=PATH;]$env:PATH:$env:AGENT_TOOLSDIRECTORY/Microsoft.PowerApps.CLI";
Write-Host "##vso[task.setvariable variable=PATH;]xxxxx";
Write-Host "PATH=$env:PATH"