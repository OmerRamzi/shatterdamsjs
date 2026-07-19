import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building, CreditCard, Mail, Key, Loader2, Save, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [settings, setSettings] = useState({
    // General
    company_name: '',
    support_email: '',
    support_phone: '',
    company_address: '',
    timezone: 'Asia/Colombo',
    
    // Billing
    default_currency: 'USD',
    default_tax_rate: '0',
    invoice_terms: '',

    // Email Templates
    invoice_email_subject: 'Invoice {{invoiceNumber}} from {{companyName}}',
    invoice_email_body: '<h2>Invoice {{invoiceNumber}}</h2>\\n<p>Dear {{clientName}},</p>\\n<p>A new invoice has been generated for your account for the amount of <strong>${{total}}</strong>.</p>\\n<p>You can view and download your invoice securely by logging into your client portal.</p>\\n<p><strong>Portal Login:</strong> {{portalLink}}</p>\\n<br/>\\n<p>Thank you for your business!</p>',

    // Integrations
    resend_api_key: ''
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        alert('Error saving settings: ' + err.error);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Organization', icon: Building },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'email', label: 'Email Templates', icon: Mail },
    { id: 'integrations', label: 'Integrations', icon: Key },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1">Manage organization preferences and defaults.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saveSuccess ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-yellow-400 text-slate-900 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 shadow-sm min-h-[500px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            </div>
          ) : (
            <div className="max-w-2xl">
              
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-xl font-semibold text-slate-200 mb-6 border-b border-slate-800 pb-2">Organization Profile</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                      <input name="company_name" value={settings.company_name} onChange={handleChange} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all" placeholder="e.g. Shatter" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Support Email</label>
                        <input name="support_email" value={settings.support_email} onChange={handleChange} type="email" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
                        <input name="support_phone" value={settings.support_phone} onChange={handleChange} type="tel" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Company Address</label>
                      <textarea name="company_address" value={settings.company_address} onChange={handleChange} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all"></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Default Timezone</label>
                      <select name="timezone" value={settings.timezone} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all">
                        <option value="Asia/Colombo">Sri Lanka (Asia/Colombo)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (US/New York)</option>
                        <option value="Europe/London">London (Europe/London)</option>
                        <option value="Asia/Dubai">Dubai (Asia/Dubai)</option>
                        <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">This defines how dates and times are interpreted globally for automated jobs.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-xl font-semibold text-slate-200 mb-6 border-b border-slate-800 pb-2">Billing & Invoicing</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Default Currency</label>
                        <select name="default_currency" value={settings.default_currency} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all">
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="AUD">AUD ($)</option>
                          <option value="LKR">LKR (Rs.)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Default Tax Rate (%)</label>
                        <input name="default_tax_rate" value={settings.default_tax_rate} onChange={handleChange} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Default Invoice Terms & Conditions</label>
                      <textarea name="invoice_terms" value={settings.invoice_terms} onChange={handleChange} rows={6} placeholder="Payment is due within 14 days..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all"></textarea>
                      <p className="text-xs text-slate-500 mt-1">These terms will automatically populate at the bottom of all new invoices.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-xl font-semibold text-slate-200 mb-2 border-b border-slate-800 pb-2">Email Templates</h3>
                  <p className="text-sm text-slate-400 mb-6">Customize the automated emails sent by the system using HTML and dynamic variables.</p>
                  
                  <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
                    <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Available Variables</h4>
                    <div className="flex flex-wrap gap-2">
                      {['{{clientName}}', '{{invoiceNumber}}', '{{total}}', '{{companyName}}', '{{portalLink}}'].map(tag => (
                        <span key={tag} className="bg-slate-700 text-yellow-400 px-2 py-1 rounded text-xs font-mono select-all">{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h4 className="font-semibold text-slate-300 mb-3">Invoice Sent Template</h4>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Email Subject</label>
                      <input name="invoice_email_subject" value={settings.invoice_email_subject} onChange={handleChange} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all font-mono" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Email Body (HTML)</label>
                      <textarea name="invoice_email_body" value={settings.invoice_email_body} onChange={handleChange} rows={12} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all font-mono whitespace-pre"></textarea>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-xl font-semibold text-slate-200 mb-6 border-b border-slate-800 pb-2">Integrations</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Resend API Key (Email Delivery)</label>
                      <input 
                        name="resend_api_key" 
                        value={settings.resend_api_key} 
                        onChange={handleChange} 
                        type="password" 
                        placeholder={settings.resend_api_key === '********' ? '••••••••••••••••' : 're_...'} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all font-mono" 
                      />
                      <p className="text-xs text-slate-500 mt-1">If left blank, the system will use the default environment API key.</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
