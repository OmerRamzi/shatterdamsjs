import { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Download,
  Building2,
  Users
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  defaultType?: 'leads' | 'contacts';
}

// Robust CSV parser handling quotes, commas within quotes, multi-line values
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // Skip \r\n
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1);
  return { headers, rows };
}

export function CsvImportModal({ isOpen, onClose, onImportComplete, defaultType = 'leads' }: CsvImportModalProps) {
  const [importType, setImportType] = useState<'leads' | 'contacts'>(defaultType);
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'complete'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  // Field mappings: Target Field -> CSV Header Name
  const [leadMapping, setLeadMapping] = useState<Record<string, string>>({
    title: '',
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    source: '',
    status: '',
    priority: '',
    estimatedValue: '',
    notes: '',
  });

  const [contactMapping, setContactMapping] = useState<Record<string, string>>({
    firstName: '',
    lastName: '',
    fullName: '',
    companyName: '',
    jobTitle: '',
    email: '',
    phone: '',
    role: '',
    notes: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-detect Zoho CRM and generic CRM columns
  const autoDetectMappings = (headers: string[], type: 'leads' | 'contacts') => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (type === 'leads') {
      const newMapping: Record<string, string> = {
        title: '',
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        source: '',
        status: '',
        priority: '',
        estimatedValue: '',
        notes: '',
      };

      for (const h of headers) {
        const norm = normalize(h);
        if (!newMapping.companyName && (norm.includes('company') || norm.includes('accountname') || norm === 'account')) newMapping.companyName = h;
        else if (!newMapping.contactName && (norm.includes('contactname') || norm.includes('fullname') || norm === 'name' || norm.includes('leadname'))) newMapping.contactName = h;
        else if (!newMapping.email && (norm.includes('email') || norm.includes('mail'))) newMapping.email = h;
        else if (!newMapping.phone && (norm.includes('phone') || norm.includes('mobile') || norm.includes('cell'))) newMapping.phone = h;
        else if (!newMapping.source && (norm.includes('source') || norm.includes('leadsource') || norm.includes('channel'))) newMapping.source = h;
        else if (!newMapping.status && (norm.includes('status') || norm.includes('leadstatus') || norm.includes('stage'))) newMapping.status = h;
        else if (!newMapping.priority && (norm.includes('priority') || norm.includes('rating') || norm.includes('score'))) newMapping.priority = h;
        else if (!newMapping.estimatedValue && (norm.includes('revenue') || norm.includes('amount') || norm.includes('value') || norm.includes('budget') || norm.includes('deal'))) newMapping.estimatedValue = h;
        else if (!newMapping.notes && (norm.includes('description') || norm.includes('note') || norm.includes('remark') || norm.includes('comment'))) newMapping.notes = h;
        else if (!newMapping.title && (norm.includes('title') || norm.includes('opportunity') || norm.includes('dealname'))) newMapping.title = h;
      }
      setLeadMapping(newMapping);
    } else {
      const newMapping: Record<string, string> = {
        firstName: '',
        lastName: '',
        fullName: '',
        companyName: '',
        jobTitle: '',
        email: '',
        phone: '',
        role: '',
        notes: '',
      };

      for (const h of headers) {
        const norm = normalize(h);
        if (!newMapping.firstName && (norm.includes('firstname') || norm === 'first')) newMapping.firstName = h;
        else if (!newMapping.lastName && (norm.includes('lastname') || norm === 'last' || norm === 'surname')) newMapping.lastName = h;
        else if (!newMapping.fullName && (norm.includes('fullname') || norm.includes('contactname') || norm === 'name')) newMapping.fullName = h;
        else if (!newMapping.companyName && (norm.includes('company') || norm.includes('account') || norm.includes('organization'))) newMapping.companyName = h;
        else if (!newMapping.jobTitle && (norm.includes('title') || norm.includes('designation') || norm.includes('position') || norm.includes('role'))) newMapping.jobTitle = h;
        else if (!newMapping.email && (norm.includes('email') || norm.includes('mail'))) newMapping.email = h;
        else if (!newMapping.phone && (norm.includes('phone') || norm.includes('mobile') || norm.includes('cell'))) newMapping.phone = h;
        else if (!newMapping.notes && (norm.includes('description') || norm.includes('note') || norm.includes('comment'))) newMapping.notes = h;
      }
      setContactMapping(newMapping);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0 || rows.length === 0) {
          throw new Error('CSV file appears empty or has no data rows.');
        }

        setCsvHeaders(headers);
        setRawRows(rows);
        autoDetectMappings(headers, importType);
        setStep('map');
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    let csvContent = '';
    let sampleFilename = '';

    if (importType === 'leads') {
      sampleFilename = 'zoho-leads-sample.csv';
      csvContent = 'Company,First Name,Last Name,Email,Phone,Lead Source,Lead Status,Annual Revenue,Description\n' +
        '"Apex Global Corp","Sarah","Jenkins","sarah@apex.com","+94 77 123 4567","Website Form","Qualified","350000","Interested in corporate rebranding & video assets"\n' +
        '"Summit Media","David","Miller","david@summitmedia.com","+94 71 987 6543","Referral","Contacted","150000","Requested proposal for social media campaigns"';
    } else {
      sampleFilename = 'zoho-contacts-sample.csv';
      csvContent = 'First Name,Last Name,Account Name,Title,Email,Phone,Department,Description\n' +
        '"Sarah","Jenkins","Apex Global Corp","Chief Marketing Officer","sarah@apex.com","+94 77 123 4567","Marketing","Primary decision maker"\n' +
        '"Michael","Chang","Apex Global Corp","Finance Director","mchang@apex.com","+94 77 999 8888","Finance","Direct contact for invoice approvals"';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', sampleFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeImport = async () => {
    setStep('importing');
    setError('');

    try {
      const headerIndexMap = new Map<string, number>();
      csvHeaders.forEach((h, idx) => headerIndexMap.set(h, idx));

      const mapping = importType === 'leads' ? leadMapping : contactMapping;

      const items = rawRows.map(row => {
        const item: Record<string, string> = {};
        for (const [targetField, csvHeader] of Object.entries(mapping)) {
          if (csvHeader && headerIndexMap.has(csvHeader)) {
            const idx = headerIndexMap.get(csvHeader)!;
            item[targetField] = (row[idx] || '').trim();
          }
        }
        return item;
      }).filter(item => {
        // Filter empty rows
        if (importType === 'leads') {
          return item.companyName || item.contactName || item.email || item.title;
        } else {
          return item.firstName || item.fullName || item.email || item.companyName;
        }
      });

      if (items.length === 0) {
        throw new Error('No valid rows found to import based on mapping.');
      }

      const endpoint = importType === 'leads' ? '/api/crm/import/leads' : '/api/crm/import/contacts';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import request failed');
      }

      setImportedCount(data.importedCount || items.length);
      setStep('complete');
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Error occurred during import');
      setStep('map');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-200/60">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Import from Zoho CRM / CSV
              </h3>
              <p className="text-xs text-slate-500">
                Migrate your leads or contacts directly into Shatter DAMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Entity Selector */}
        {step === 'upload' && (
          <div className="px-5 pt-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-600 mr-2">Import Target:</span>
            <button
              onClick={() => setImportType('leads')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                importType === 'leads'
                  ? 'bg-amber-400/20 text-amber-900 ring-1 ring-amber-400/40 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Leads (Zoho Leads)</span>
            </button>
            <button
              onClick={() => setImportType('contacts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                importType === 'contacts'
                  ? 'bg-amber-400/20 text-amber-900 ring-1 ring-amber-400/40 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts (Stakeholders)</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className="border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    Click to browse or drag & drop Zoho CRM CSV file
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supports standard Zoho CRM, Salesforce, HubSpot, or custom CSV exports
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
              </div>

              {/* Sample Template & Help */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Need an example structure?</span>
                  <span className="text-[11px] text-slate-500">
                    Download a pre-formatted {importType === 'leads' ? 'Leads' : 'Contacts'} CSV template.
                  </span>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample</span>
                </button>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Map CSV Columns</h4>
                  <p className="text-xs text-slate-500">
                    We automatically detected matches from <strong>{fileName}</strong> ({rawRows.length} rows).
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Choose different file
                </button>
              </div>

              {/* Column Mapping Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {importType === 'leads' ? (
                  <>
                    {[
                      { field: 'companyName', label: 'Company / Organization', required: false },
                      { field: 'contactName', label: 'Contact Person Name', required: false },
                      { field: 'title', label: 'Lead / Project Opportunity Title', required: false },
                      { field: 'email', label: 'Email Address', required: false },
                      { field: 'phone', label: 'Phone Number', required: false },
                      { field: 'estimatedValue', label: 'Deal Amount / Revenue', required: false },
                      { field: 'source', label: 'Lead Source (e.g. Website, Referral)', required: false },
                      { field: 'status', label: 'Lead Status (e.g. Qualified)', required: false },
                      { field: 'priority', label: 'Priority (e.g. Hot, High)', required: false },
                      { field: 'notes', label: 'Description / Discovery Notes', required: false },
                    ].map(item => (
                      <div key={item.field} className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {item.label}
                        </label>
                        <select
                          value={leadMapping[item.field] || ''}
                          onChange={(e) => setLeadMapping({ ...leadMapping, [item.field]: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
                        >
                          <option value="">— (Ignore / Skip) —</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { field: 'firstName', label: 'First Name', required: true },
                      { field: 'lastName', label: 'Last Name', required: false },
                      { field: 'fullName', label: 'Or Full Name (if combined)', required: false },
                      { field: 'companyName', label: 'Company / Account Name', required: false },
                      { field: 'jobTitle', label: 'Job Title / Designation', required: false },
                      { field: 'email', label: 'Email Address', required: false },
                      { field: 'phone', label: 'Phone Number', required: false },
                      { field: 'role', label: 'Stakeholder Role', required: false },
                      { field: 'notes', label: 'Notes / Description', required: false },
                    ].map(item => (
                      <div key={item.field} className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {item.label}
                        </label>
                        <select
                          value={contactMapping[item.field] || ''}
                          onChange={(e) => setContactMapping({ ...contactMapping, [item.field]: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
                        >
                          <option value="">— (Ignore / Skip) —</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Sample Data Preview */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Preview (Row 1 from CSV):
                </span>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-24">
                  {rawRows[0]?.map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-amber-400 shrink-0 font-bold">{csvHeaders[idx]}:</span>
                      <span className="truncate">{val || '(empty)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <h4 className="font-extrabold text-slate-900 text-base">Importing Records...</h4>
              <p className="text-xs text-slate-500 mt-1">
                Parsing, sanitizing, and creating {importType} in Shatter CRM.
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-black text-slate-900 text-lg">Import Complete!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Successfully imported <strong>{importedCount} {importType}</strong> into your CRM database.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          {step === 'complete' ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors text-center"
            >
              Done & View Imported Data
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors text-xs sm:text-sm"
              >
                Cancel
              </button>

              {step === 'map' && (
                <button
                  type="button"
                  onClick={executeImport}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold transition-all shadow-xs text-xs sm:text-sm"
                >
                  <span>Start Import ({rawRows.length} Rows)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
