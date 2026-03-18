import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { UserRound, Wrench, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Customer } from '@/types';

interface Props {
    open: boolean;
    onClose: () => void;
    customers: Pick<Customer, 'id' | 'name' | 'phone'>[];
}

export default function AcceptModal({ open, onClose, customers }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: null as number | null,
        customer_name: '',
        customer_phone: '',
        problem_description: '',
    });

    const [customerSearch, setCustomerSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredCustomers = customers.filter((c) => {
        if (!customerSearch.trim()) return true;
        const term = customerSearch.toLowerCase();
        return c.name.toLowerCase().includes(term) || (c.phone ?? '').includes(term);
    });

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectCustomer = (c: Pick<Customer, 'id' | 'name' | 'phone'>) => {
        setData((prev) => ({
            ...prev,
            customer_id: c.id,
            customer_name: c.name,
            customer_phone: c.phone ?? '',
        }));
        setCustomerSearch(c.name);
        setShowDropdown(false);
    };

    const clearCustomer = () => {
        setData((prev) => ({ ...prev, customer_id: null, customer_name: '', customer_phone: '' }));
        setCustomerSearch('');
    };

    const handleClose = () => {
        reset();
        setCustomerSearch('');
        setShowDropdown(false);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('repairs.store'));
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Accept Repair Job
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Customer lookup */}
                    <div className="space-y-1">
                        <Label>Customer</Label>
                        <div className="relative" ref={dropdownRef}>
                            {data.customer_id ? (
                                <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
                                    <div>
                                        <span className="font-medium">{data.customer_name}</span>
                                        {data.customer_phone && (
                                            <span className="ml-2 text-muted-foreground">{data.customer_phone}</span>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" type="button" onClick={clearCustomer}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search customer or leave blank for walk-in…"
                                            value={customerSearch}
                                            onChange={(e) => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                                            onFocus={() => setShowDropdown(true)}
                                            className="pl-9"
                                        />
                                    </div>
                                    {showDropdown && (
                                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                                            {filteredCustomers.length === 0 ? (
                                                <p className="px-3 py-2 text-sm text-muted-foreground">No matches — will be recorded as walk-in.</p>
                                            ) : (
                                                filteredCustomers.slice(0, 8).map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                                        onClick={() => selectCustomer(c)}
                                                    >
                                                        <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">{c.name}</p>
                                                            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Walk-in name (shown when no customer selected) */}
                    {!data.customer_id && (
                        <div className="space-y-1">
                            <Label htmlFor="customer_name">
                                Customer Name <span className="text-muted-foreground text-xs">(for walk-in)</span>
                            </Label>
                            <Input
                                id="customer_name"
                                value={data.customer_name}
                                onChange={(e) => setData('customer_name', e.target.value)}
                                placeholder="e.g. Juan dela Cruz"
                            />
                            {errors.customer_name && <p className="text-xs text-destructive">{errors.customer_name}</p>}
                        </div>
                    )}

                    {/* Phone */}
                    <div className="space-y-1">
                        <Label htmlFor="customer_phone">Phone Number</Label>
                        <Input
                            id="customer_phone"
                            value={data.customer_phone}
                            onChange={(e) => setData('customer_phone', e.target.value)}
                            placeholder="09XXXXXXXXX"
                            type="tel"
                        />
                        {errors.customer_phone && <p className="text-xs text-destructive">{errors.customer_phone}</p>}
                    </div>

                    {/* Problem description */}
                    <div className="space-y-1">
                        <Label htmlFor="problem_description">Problem Description *</Label>
                        <Textarea
                            id="problem_description"
                            value={data.problem_description}
                            onChange={(e) => setData('problem_description', e.target.value)}
                            placeholder="Describe the issue…"
                            rows={4}
                            required
                        />
                        {errors.problem_description && <p className="text-xs text-destructive">{errors.problem_description}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || !data.problem_description.trim()}>
                            {processing ? 'Saving…' : 'Accept & Print Stub'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
