import { useState, useEffect } from "react";
import { Link, Check, Copy, Loader2, Webhook, ShoppingBag, CreditCard } from "lucide-react";

export const IntegrationSettingsModal = ({ 
  isOpen, 
  onClose,
  tenantId
}: { 
  isOpen: boolean; 
  onClose: () => void;
  tenantId?: number;
}) => {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'shopify' | 'payhere'>('webhooks');
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings states
  const [settings, setSettings] = useState({
    shopify_org_id: "",
    shopify_access_token: "",
    payhere_app_id: "",
    payhere_app_secret: ""
  });

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([
        fetch("/api/commissions/webhook-secret").then(res => res.json()),
        fetch("/api/settings").then(res => res.json())
      ]).then(([webhookData, settingsData]) => {
        setWebhookSecret(webhookData.secret);
        setSettings({
          shopify_org_id: settingsData.shopify_org_id || "",
          shopify_access_token: settingsData.shopify_access_token || "",
          payhere_app_id: settingsData.payhere_app_id || "",
          payhere_app_secret: settingsData.payhere_app_secret || ""
        });
      }).finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyWebhookUrl = () => {
    const backendUrl = import.meta.env.DEV ? 'http://localhost:8787' : window.location.origin;
    const url = `${backendUrl}/api/webhooks/commissions/${tenantId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        onClose();
      } else {
        alert("Failed to save settings");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl w-full flex overflow-hidden min-h-[400px]">
        
        {/* Sidebar */}
        <div className="w-48 bg-secondary/30 border-r border-border p-4 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Integrations</h3>
          
          <button 
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'webhooks' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}`}
          >
            <Webhook className="w-4 h-4" /> Webhooks
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('shopify')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'shopify' ? 'bg-emerald-500/10 text-emerald-600' : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}`}
          >
            <ShoppingBag className="w-4 h-4" /> Shopify Partner
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('payhere')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'payhere' ? 'bg-blue-500/10 text-blue-600' : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}`}
          >
            <CreditCard className="w-4 h-4" /> PayHere (SL)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {activeTab === 'webhooks' && (
                <div className="flex-1 animate-in fade-in flex flex-col">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Link className="w-5 h-5" /> API Webhooks</h2>
                  <p className="text-sm text-muted-foreground mb-6">Push commissions from external partners directly into your dashboard.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1 text-slate-700">Webhook POST URL</label>
                      <div className="flex items-center gap-2">
                        <input readOnly value={`${import.meta.env.DEV ? 'http://localhost:8787' : window.location.origin}/api/webhooks/commissions/${tenantId}`} className="w-full bg-secondary/50 font-mono text-xs border border-border rounded-lg px-3 py-3 text-slate-600" />
                        <button type="button" onClick={copyWebhookUrl} className="p-3 bg-secondary rounded-lg hover:bg-slate-200 transition-colors" title="Copy URL">
                          {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-600" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold mb-1 text-slate-700">Webhook Secret</label>
                      <input readOnly value={webhookSecret} className="w-full bg-secondary/50 font-mono text-xs border border-border rounded-lg px-3 py-3 text-slate-600" />
                      <p className="text-xs text-muted-foreground mt-1">Pass this token in the <code className="text-amber-600">x-webhook-secret</code> header.</p>
                    </div>

                    <div className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                      <p className="text-emerald-400 mb-2">// Payload Example</p>
                      {`{
  "source": "Custom Integration",
  "amount": "45.00",
  "currency": "USD",
  "referenceId": "txn_12345",
  "notes": "Referral payout"
}`}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6 mt-auto">
                    <button type="button" onClick={onClose} className="btn-primary w-full sm:w-auto">Done</button>
                  </div>
                </div>
              )}

              {activeTab === 'shopify' && (
                <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col animate-in fade-in">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-600"><ShoppingBag className="w-5 h-5" /> Shopify Partner</h2>
                  <p className="text-sm text-muted-foreground mb-6">Automatically track partner payouts. We'll poll the Shopify Partner GraphQL API daily to sync your earnings.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">Organization ID</label>
                      <input 
                        type="text" 
                        value={settings.shopify_org_id} 
                        onChange={e => setSettings({...settings, shopify_org_id: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" 
                        placeholder="e.g. 1234567" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Partner API Access Token</label>
                      <input 
                        type="password" 
                        value={settings.shopify_access_token} 
                        onChange={e => setSettings({...settings, shopify_access_token: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" 
                        placeholder="shpat_..." 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 mt-auto border-t border-border mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                    <button type="submit" disabled={isSaving} className="btn-primary">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'payhere' && (
                <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col animate-in fade-in">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-600"><CreditCard className="w-5 h-5" /> PayHere (Sri Lanka)</h2>
                  <p className="text-sm text-muted-foreground mb-6">Automatically track revenue from PayHere. Provide your Business App API keys to enable daily syncing.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">App ID / Merchant ID</label>
                      <input 
                        type="text" 
                        value={settings.payhere_app_id} 
                        onChange={e => setSettings({...settings, payhere_app_id: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" 
                        placeholder="e.g. 4BXXXXXX" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">App Secret</label>
                      <input 
                        type="password" 
                        value={settings.payhere_app_secret} 
                        onChange={e => setSettings({...settings, payhere_app_secret: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" 
                        placeholder="4BXXXXXXX..." 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 mt-auto border-t border-border mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                    <button type="submit" disabled={isSaving} className="btn-primary">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
