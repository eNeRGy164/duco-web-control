[CmdletBinding()]
Param(
    [Parameter()]
    [String]
    $Version = '0.4.0'
)

$ErrorActionPreference = 'Stop'

& docker build . --pull --rm --tag energy164/duco-web:latest --tag energy164/duco-web:$Version
& docker push energy164/duco-web:latest
& docker push energy164/duco-web:$Version
