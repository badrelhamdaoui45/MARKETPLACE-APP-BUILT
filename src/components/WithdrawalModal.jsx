import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAccountBalance, createPayout, getPayoutHistory } from '../lib/stripe/service';
import Button from './ui/Button';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const WithdrawalModal = ({ isOpen, onClose, profile }) => {
    const [loading, setLoading] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [balance, setBalance] = useState(null);
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [withdrawals, setWithdrawals] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (isOpen && profile?.stripe_account_id) {
            fetchBalance();
            fetchWithdrawals();
        }
    }, [isOpen, profile]);

    const fetchBalance = async () => {
        try {
            setLoading(true);
            const balanceData = await getAccountBalance(profile.stripe_account_id);
            setBalance(balanceData);
        } catch (err) {
            console.error('Error fetching balance:', err);
            setError('Failed to fetch balance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchWithdrawals = async () => {
        try {
            const { data, error } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('photographer_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setWithdrawals(data || []);
        } catch (err) {
            console.error('Error fetching withdrawals:', err);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        const amount = parseFloat(withdrawalAmount);
        const availableBalance = balance?.available?.[0]?.amount || 0;
        const availableInDollars = availableBalance / 100;

        if (amount > availableInDollars) {
            setError(`Insufficient balance. Available: $${availableInDollars.toFixed(2)}`);
            return;
        }

        if (amount < 1) {
            setError('Minimum withdrawal amount is $1.00');
            return;
        }

        try {
            setWithdrawing(true);
            setError(null);
            setSuccess(null);

            const payout = await createPayout(profile.stripe_account_id, amount);

            const { error: dbError } = await supabase
                .from('withdrawals')
                .insert({
                    photographer_id: profile.id,
                    amount: amount,
                    stripe_payout_id: payout.id,
                    status: payout.status === 'paid' ? 'paid' : 'pending',
                });

            if (dbError) throw dbError;

            setSuccess(`Withdrawal of $${amount.toFixed(2)} initiated successfully!`);
            setWithdrawalAmount('');

            await fetchBalance();
            await fetchWithdrawals();

        } catch (err) {
            console.error('Error creating withdrawal:', err);
            setError(err.message || 'Failed to process withdrawal. Please try again.');
        } finally {
            setWithdrawing(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid':
                return <CheckCircle size={16} style={{ color: '#059669' }} />;
            case 'pending':
                return <Clock size={16} style={{ color: '#d97706' }} />;
            case 'failed':
                return <XCircle size={16} style={{ color: '#dc2626' }} />;
            case 'canceled':
                return <AlertCircle size={16} style={{ color: '#64748b' }} />;
            default:
                return <Clock size={16} style={{ color: '#64748b' }} />;
        }
    };

    if (!isOpen) return null;

    const availableBalance = balance?.available?.[0]?.amount || 0;
    const pendingBalance = balance?.pending?.[0]?.amount || 0;
    const availableInDollars = availableBalance / 100;
    const pendingInDollars = pendingBalance / 100;

    return (
        <div className="withdrawal-modal-overlay" onClick={onClose}>
            <div className="withdrawal-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Mobile Handle */}
                <div className="mobile-handle"></div>

                {/* Header */}
                <div className="withdrawal-modal-header">
                    <h2>Withdraw Funds</h2>
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="withdrawal-modal-body">
                    {/* Balance Cards */}
                    <div className="balance-cards-grid">
                        <div className="balance-card balance-available">
                            <div className="balance-card-icon">
                                <DollarSign size={20} />
                            </div>
                            <div className="balance-card-content">
                                <div className="balance-card-label">Available</div>
                                <div className="balance-card-amount">
                                    {loading ? '...' : `$${availableInDollars.toFixed(2)}`}
                                </div>
                                <div className="balance-card-note">Ready to withdraw</div>
                            </div>
                        </div>

                        <div className="balance-card balance-pending">
                            <div className="balance-card-icon">
                                <TrendingUp size={20} />
                            </div>
                            <div className="balance-card-content">
                                <div className="balance-card-label">Pending</div>
                                <div className="balance-card-amount">
                                    {loading ? '...' : `$${pendingInDollars.toFixed(2)}`}
                                </div>
                                <div className="balance-card-note">Processing</div>
                            </div>
                        </div>
                    </div>

                    {/* Withdrawal Form */}
                    <div className="withdrawal-form-section">
                        <label htmlFor="withdrawal-amount" className="form-label">
                            Withdrawal Amount
                        </label>
                        <div className="amount-input-container">
                            <span className="currency-prefix">$</span>
                            <input
                                id="withdrawal-amount"
                                type="number"
                                step="0.01"
                                min="1"
                                max={availableInDollars}
                                value={withdrawalAmount}
                                onChange={(e) => setWithdrawalAmount(e.target.value)}
                                placeholder="0.00"
                                disabled={withdrawing || loading}
                                className="amount-input"
                            />
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="quick-amount-buttons">
                            <button
                                type="button"
                                onClick={() => setWithdrawalAmount((availableInDollars * 0.25).toFixed(2))}
                                disabled={withdrawing || loading || availableInDollars < 1}
                                className="quick-amount-btn"
                            >
                                25%
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalAmount((availableInDollars * 0.5).toFixed(2))}
                                disabled={withdrawing || loading || availableInDollars < 1}
                                className="quick-amount-btn"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalAmount((availableInDollars * 0.75).toFixed(2))}
                                disabled={withdrawing || loading || availableInDollars < 1}
                                className="quick-amount-btn"
                            >
                                75%
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalAmount(availableInDollars.toFixed(2))}
                                disabled={withdrawing || loading || availableInDollars < 1}
                                className="quick-amount-btn"
                            >
                                Max
                            </button>
                        </div>

                        {/* Alerts */}
                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="alert alert-success">
                                <CheckCircle size={18} />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            onClick={handleWithdraw}
                            disabled={withdrawing || loading || !withdrawalAmount || availableInDollars < 1}
                            className="withdrawal-submit-btn"
                        >
                            {withdrawing ? 'Processing...' : 'Withdraw Funds'}
                        </Button>
                    </div>

                    {/* Withdrawal History */}
                    <div className="withdrawal-history-section">
                        <h3 className="section-title">Recent Withdrawals</h3>
                        {withdrawals.length === 0 ? (
                            <p className="empty-message">No withdrawals yet</p>
                        ) : (
                            <div className="withdrawal-history-list">
                                {withdrawals.map((withdrawal) => (
                                    <div key={withdrawal.id} className="withdrawal-history-item">
                                        <div className="withdrawal-icon">
                                            {getStatusIcon(withdrawal.status)}
                                        </div>
                                        <div className="withdrawal-info">
                                            <div className="withdrawal-info-amount">
                                                ${Number(withdrawal.amount).toFixed(2)}
                                            </div>
                                            <div className="withdrawal-info-date">
                                                {new Date(withdrawal.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        <div className="withdrawal-badge">
                                            {withdrawal.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    /* Overlay */
                    .withdrawal-modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.6);
                        backdrop-filter: blur(4px);
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 1rem;
                        animation: fadeIn 0.2s ease-out;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    /* Modal Container */
                    .withdrawal-modal-container {
                        background: white;
                        border-radius: 20px;
                        width: 100%;
                        max-width: 600px;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        animation: slideUp 0.3s ease-out;
                    }

                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    /* Mobile Handle */
                    .mobile-handle {
                        display: none;
                        width: 40px;
                        height: 4px;
                        background: #cbd5e1;
                        border-radius: 2px;
                        margin: 0.75rem auto 0;
                    }

                    /* Header */
                    .withdrawal-modal-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1.5rem 1.5rem 1rem;
                        border-bottom: 1px solid #f1f5f9;
                    }

                    .withdrawal-modal-header h2 {
                        font-size: 1.5rem;
                        font-weight: 800;
                        color: #1e293b;
                        margin: 0;
                    }

                    .close-button {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 40px;
                        height: 40px;
                        border: none;
                        background: #f1f5f9;
                        border-radius: 50%;
                        cursor: pointer;
                        color: #64748b;
                        transition: all 0.2s;
                    }

                    .close-button:hover {
                        background: #e2e8f0;
                        color: #1e293b;
                    }

                    /* Body */
                    .withdrawal-modal-body {
                        padding: 1.5rem;
                    }

                    /* Balance Cards */
                    .balance-cards-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }

                    .balance-card {
                        padding: 1.25rem;
                        border-radius: 12px;
                        display: flex;
                        align-items: flex-start;
                        gap: 0.75rem;
                        border: 2px solid;
                        transition: transform 0.2s;
                    }

                    .balance-card:hover {
                        transform: translateY(-2px);
                    }

                    .balance-available {
                        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                        border-color: #86efac;
                    }

                    .balance-pending {
                        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                        border-color: #fcd34d;
                    }

                    .balance-card-icon {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 40px;
                        height: 40px;
                        background: white;
                        border-radius: 10px;
                        flex-shrink: 0;
                    }

                    .balance-available .balance-card-icon {
                        color: #059669;
                    }

                    .balance-pending .balance-card-icon {
                        color: #d97706;
                    }

                    .balance-card-content {
                        flex: 1;
                        min-width: 0;
                    }

                    .balance-card-label {
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 0.25rem;
                    }

                    .balance-card-amount {
                        font-size: 1.5rem;
                        font-weight: 800;
                        color: #1e293b;
                        margin-bottom: 0.125rem;
                        line-height: 1.2;
                    }

                    .balance-card-note {
                        font-size: 0.7rem;
                        color: #94a3b8;
                    }

                    /* Withdrawal Form */
                    .withdrawal-form-section {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                    }

                    .form-label {
                        display: block;
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 0.5rem;
                    }

                    .amount-input-container {
                        position: relative;
                        margin-bottom: 1rem;
                    }

                    .currency-prefix {
                        position: absolute;
                        left: 1rem;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #64748b;
                        pointer-events: none;
                    }

                    .amount-input {
                        width: 100%;
                        padding: 1rem 1rem 1rem 2.75rem;
                        font-size: 1.5rem;
                        font-weight: 700;
                        border: 2px solid #e2e8f0;
                        border-radius: 10px;
                        background: white;
                        color: #1e293b;
                        transition: all 0.2s;
                    }

                    .amount-input:focus {
                        outline: none;
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }

                    .amount-input:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    /* Quick Amount Buttons */
                    .quick-amount-buttons {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.5rem;
                        margin-bottom: 1rem;
                    }

                    .quick-amount-btn {
                        padding: 0.625rem;
                        background: white;
                        border: 2px solid #e2e8f0;
                        border-radius: 8px;
                        font-size: 0.875rem;
                        font-weight: 700;
                        color: #475569;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .quick-amount-btn:hover:not(:disabled) {
                        background: #f1f5f9;
                        border-color: #cbd5e1;
                        transform: translateY(-1px);
                    }

                    .quick-amount-btn:active:not(:disabled) {
                        transform: translateY(0);
                    }

                    .quick-amount-btn:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                    }

                    /* Alerts */
                    .alert {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 0.875rem 1rem;
                        border-radius: 8px;
                        margin-bottom: 1rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        border: 1px solid;
                    }

                    .alert-error {
                        background: #fef2f2;
                        color: #991b1b;
                        border-color: #fecaca;
                    }

                    .alert-success {
                        background: #f0fdf4;
                        color: #166534;
                        border-color: #bbf7d0;
                    }

                    /* Submit Button */
                    .withdrawal-submit-btn {
                        width: 100%;
                        background: #059669 !important;
                        color: white !important;
                        font-weight: 700 !important;
                        padding: 1rem !important;
                        font-size: 1rem !important;
                        border-radius: 10px !important;
                        border: none !important;
                        transition: all 0.2s !important;
                    }

                    .withdrawal-submit-btn:hover:not(:disabled) {
                        background: #047857 !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    }

                    .withdrawal-submit-btn:active:not(:disabled) {
                        transform: translateY(0);
                    }

                    .withdrawal-submit-btn:disabled {
                        opacity: 0.5 !important;
                        cursor: not-allowed !important;
                    }

                    /* Withdrawal History */
                    .withdrawal-history-section {
                        margin-top: 1.5rem;
                    }

                    .section-title {
                        font-size: 1rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-bottom: 1rem;
                    }

                    .withdrawal-history-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                    }

                    .withdrawal-history-item {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        padding: 1rem;
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        transition: all 0.2s;
                    }

                    .withdrawal-history-item:hover {
                        border-color: #cbd5e1;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    }

                    .withdrawal-icon {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }

                    .withdrawal-info {
                        flex: 1;
                        min-width: 0;
                    }

                    .withdrawal-info-amount {
                        font-size: 1rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-bottom: 0.125rem;
                    }

                    .withdrawal-info-date {
                        font-size: 0.8rem;
                        color: #64748b;
                    }

                    .withdrawal-badge {
                        font-size: 0.7rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        background: #f1f5f9;
                        padding: 0.25rem 0.625rem;
                        border-radius: 6px;
                        letter-spacing: 0.05em;
                    }

                    .empty-message {
                        text-align: center;
                        color: #94a3b8;
                        padding: 2.5rem 1rem;
                        font-size: 0.9rem;
                    }

                    /* Mobile Optimizations */
                    @media (max-width: 640px) {
                        .withdrawal-modal-overlay {
                            padding: 0;
                            align-items: flex-end;
                        }

                        .withdrawal-modal-container {
                            max-width: 100%;
                            max-height: 92vh;
                            border-radius: 24px 24px 0 0;
                            animation: slideUpMobile 0.3s ease-out;
                        }

                        @keyframes slideUpMobile {
                            from {
                                transform: translateY(100%);
                            }
                            to {
                                transform: translateY(0);
                            }
                        }

                        .mobile-handle {
                            display: block;
                        }

                        .withdrawal-modal-header {
                            padding: 1.25rem 1.5rem 1rem;
                            border-bottom: 2px solid #f1f5f9;
                        }

                        .withdrawal-modal-header h2 {
                            font-size: 1.375rem;
                            font-weight: 800;
                        }

                        .close-button {
                            width: 36px;
                            height: 36px;
                        }

                        .withdrawal-modal-body {
                            padding: 1.5rem;
                            max-height: calc(92vh - 80px);
                            overflow-y: auto;
                        }

                        .balance-cards-grid {
                            grid-template-columns: 1fr;
                            gap: 1rem;
                            margin-bottom: 1.5rem;
                        }

                        .balance-card {
                            padding: 1.25rem;
                            gap: 1rem;
                        }

                        .balance-card-icon {
                            width: 48px;
                            height: 48px;
                        }

                        .balance-card-label {
                            font-size: 0.8rem;
                        }

                        .balance-card-amount {
                            font-size: 1.5rem;
                            font-weight: 900;
                        }

                        .balance-card-note {
                            font-size: 0.75rem;
                        }

                        .withdrawal-form-section {
                            padding: 1.5rem;
                            margin-bottom: 1.5rem;
                        }

                        .form-label {
                            font-size: 0.9rem;
                            margin-bottom: 0.75rem;
                        }

                        .amount-input {
                            font-size: 1.5rem;
                            padding: 1rem 1rem 1rem 2.75rem;
                            border-width: 2px;
                        }

                        .currency-prefix {
                            font-size: 1.5rem;
                            left: 1rem;
                        }

                        .quick-amount-buttons {
                            grid-template-columns: repeat(2, 1fr);
                            gap: 0.75rem;
                            margin-bottom: 1.25rem;
                        }

                        .quick-amount-btn {
                            padding: 0.875rem;
                            font-size: 0.875rem;
                            min-height: 48px;
                            border-width: 2px;
                        }

                        .alert {
                            padding: 1rem;
                            font-size: 0.9rem;
                            margin-bottom: 1.25rem;
                        }

                        .withdrawal-submit-btn {
                            padding: 1.125rem !important;
                            font-size: 1.05rem !important;
                            min-height: 52px !important;
                        }

                        .withdrawal-history-section {
                            margin-top: 1.5rem;
                        }

                        .section-title {
                            font-size: 1.05rem;
                            margin-bottom: 1rem;
                        }

                        .withdrawal-history-item {
                            padding: 1rem;
                            gap: 0.875rem;
                        }

                        .withdrawal-icon svg {
                            width: 20px;
                            height: 20px;
                        }

                        .withdrawal-info-amount {
                            font-size: 1rem;
                            font-weight: 800;
                        }

                        .withdrawal-info-date {
                            font-size: 0.8rem;
                        }

                        .withdrawal-badge {
                            font-size: 0.7rem;
                            padding: 0.3rem 0.625rem;
                        }

                        .empty-message {
                            padding: 3rem 1.5rem;
                            font-size: 0.95rem;
                        }
                    }

                    /* Extra small mobile devices */
                    @media (max-width: 375px) {
                        .withdrawal-modal-header {
                            padding: 1rem 1.25rem 0.875rem;
                        }

                        .withdrawal-modal-header h2 {
                            font-size: 1.25rem;
                        }

                        .withdrawal-modal-body {
                            padding: 1.25rem;
                        }

                        .balance-card {
                            padding: 1rem;
                        }

                        .balance-card-amount {
                            font-size: 1.35rem;
                        }

                        .withdrawal-form-section {
                            padding: 1.25rem;
                        }

                        .amount-input {
                            font-size: 1.35rem;
                            padding: 0.875rem 0.875rem 0.875rem 2.5rem;
                        }

                        .currency-prefix {
                            font-size: 1.35rem;
                            left: 0.875rem;
                        }

                        .quick-amount-btn {
                            padding: 0.75rem;
                            font-size: 0.8rem;
                        }
                    }

                    /* Tablet Optimizations */
                    @media (min-width: 641px) and (max-width: 1024px) {
                        .withdrawal-modal-container {
                            max-width: 540px;
                        }
                    }

                    /* Touch-friendly improvements */
                    @media (hover: none) and (pointer: coarse) {
                        .quick-amount-btn,
                        .withdrawal-submit-btn,
                        .close-button {
                            min-height: 44px;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default WithdrawalModal;
