using Microsoft.Xrm.Sdk;
using System;

namespace ContosoPlugins
{
    /// <summary>
    /// Plugin development guide: https://docs.microsoft.com/powerapps/developer/common-data-service/plug-ins
    /// Best practices and guidance: https://docs.microsoft.com/powerapps/developer/common-data-service/best-practices/business-logic/
    /// </summary>
    public class AccountCreatePost : PluginBase
    {
        public AccountCreatePost(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(AccountCreatePost))
        {
        }

        // Entry point for custom business logic execution
        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
                throw new ArgumentNullException(nameof(localPluginContext));

            var context = localPluginContext.PluginExecutionContext;

            // Check for the entity on which the plugin would be registered
            if (!context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity))
                return;

            var record = (Entity)context.InputParameters["Target"];

            // Check for entity name on which this plugin would be registered
            if (record.LogicalName != "account")
                return;

            var note = new Entity("annotation");
            note["notetext"] = "Created by Plugin v8";
            note["objectid"] = record.ToEntityReference();
            localPluginContext.InitiatingUserService.Create(note);



        }
    }
}
