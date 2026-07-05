import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: any;
}

export function ClientModal({ isOpen, onClose, onSaved, client }: ClientModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Sri Lanka'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName || '',
        contactPerson: client.contactPerson || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || 'Sri Lanka'
      });
    } else {
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Sri Lanka'
      });
    }
    setError('');
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const url = client ? `/api/clients/${client.id}` : '/api/clients';
      const method = client ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save client');

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">{client ? 'Edit Client' : 'Add New Client'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <form id="clientForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name *</label>
              <input 
                type="text" 
                name="companyName"
                value={formData.companyName} 
                onChange={handleChange}
                required 
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Person *</label>
                <input 
                  type="text" 
                  name="contactPerson"
                  value={formData.contactPerson} 
                  onChange={handleChange}
                  required 
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone} 
                  onChange={handleChange}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address *</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleChange}
                required 
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input 
                type="text" 
                name="address"
                value={formData.address} 
                onChange={handleChange}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city} 
                  onChange={handleChange}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <input 
                  type="text" 
                  name="country"
                  value={formData.country} 
                  onChange={handleChange}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-secondary/10 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg font-medium hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button 
            type="submit" 
            form="clientForm"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
