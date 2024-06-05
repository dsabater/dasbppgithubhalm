# dasbppgithubhalm
Daniel's Power Platform GitHub ALM repository, with sample workflows for Dataverse.
# dasbppgithubhalm

This repository contains sample workflows for Dataverse in the Power Platform. It is intended to showcase best practices for GitHub ALM (Application Lifecycle Management) in the context of Power Platform development.

## WorkflowsDeployFlowsSample
This repository includes the following sample workflows:

- **00_helloworld**: Sample pipeline to call WhoAmI in a parameterized instance
- **00_devtorepo**: Push customizations from a DEV instance into the repository.
- 01_exportconfigdata: Export configuration data from a parameter instance into the repository.
- 02_importconfigdata: Import configuration data from the repository to a parameterized instance.
- 10_repotodev: Deploy repository content to a DEV instance (unmanaged).
- **20_repotouat**: Deploy repository content to a UAT instance (managed).
- **30_release**: Release repository content to multiple instances.
- **40_buildplugins**: Build Plugin code.
- **50_resetenvironment**: Reset a sandbox environment. (TODO: specify user with permissions to reset)
- 60_provisionenvironment: Provision a new environment.
