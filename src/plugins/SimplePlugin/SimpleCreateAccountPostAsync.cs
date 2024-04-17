using Microsoft.Xrm.Sdk;
using System;

namespace SimplePlugin
{
  /// <summary>
  /// Plugin development guide: https://docs.microsoft.com/powerapps/developer/common-data-service/plug-ins
  /// Best practices and guidance: https://docs.microsoft.com/powerapps/developer/common-data-service/best-practices/business-logic/
  /// </summary>
  public class SimpleCreateAccountPostAsync : PluginBase
  {
    public SimpleCreateAccountPostAsync(string unsecureConfiguration, string secureConfiguration)
        : base(typeof(SimpleCreateAccountPostAsync))
    {
      // TODO: Implement your custom configuration handling
      // https://docs.microsoft.com/powerapps/developer/common-data-service/register-plug-in#set-configuration-data
    }

    // Entry point for custom business logic execution
    protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
    {
      if (localPluginContext == null)
        throw new ArgumentNullException(nameof(localPluginContext));

      var context = localPluginContext.PluginExecutionContext;

      // Check for the entity on which the plugin would be registered
      if (!context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity))
        throw new InvalidPluginExecutionException("No target found for the plugin");
      
        var account = (Entity)context.InputParameters["Target"];

        // Check for entity name on which this plugin would be registered
        if (account.LogicalName != "account")
          throw new InvalidPluginExecutionException("This plugin is intended to run on the account entity only.");

        // Check if the plugin is registered on the intended message
        if (context.MessageName != "Create")
          throw new InvalidPluginExecutionException("This plugin is intended to run on the Create message only.");
      
    }
  }
}
