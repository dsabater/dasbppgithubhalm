# dasbppgithubhalm
Daniel's Power Platform GitHub ALM repository, with sample workflows for Dataverse.

This repository contains sample GitHub workflows to get started automating deployment of Dataverse solutions in the Power Platform. It is intended to showcase some example scenarios for ALM (Application Lifecycle Management) in the context of Power Platform development.

## WorkflowsDeployFlowsSample
This repository includes the following sample workflows:

- **00_helloworld**: Sample pipeline to call WhoAmI in a parameterized instance.
- **00_devtorepo**: Push customizations from a DEV instance into the repository.
- **01_exportconfigdata**: Export configuration data from an environment into the repository.
- **02_importconfigdata**: Import configuration data from the repository to a parameterized instance.
- **10_repotodev**: Deploy repository content to a DEV instance (unmanaged).
- **20_repotouat**: Deploy repository content to a UAT instance (managed).
- **30_release**: Release repository content to multiple instances.
- **40_buildplugins**: Build Plugin code.
- **50_resetenvironment**: Reset a sandbox environment. (TODO: specify user with permissions to reset)
- **60_provisionenvironment**: Provision a new environment and add service principal to the environment.


## Privileged actions using an SPN
Some actions like **Creating an environment** require tenant-level permissions. If you want to use an SPN to perform these actions, the These need to be configured by a Global Admin before executing the workflow.

* Create the Service Principal using [pac cli](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction?tabs=windows)

`` pac admin create-service-principal --name <<some-name>> `` 

* If the SPN was already created, you can use **pac cli** to add the required permissions:

`` pac admin application register -id <<applicationid>> ``

More information [here](https://learn.microsoft.com/en-us/power-platform/admin/powershell-create-service-principal)
