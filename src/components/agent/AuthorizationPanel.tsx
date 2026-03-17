'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/components/context/userContext';
import { 
  generateAuthorizationMessage,
  signAuthorization,
  isAuthorizationValid,
} from '@/utils/blockchain/eip712Authorization';

interface AuthorizationStatus {
  hasSCA: boolean;
  scaAddress?: string;
  balance?: {
    okb: string;
    usdc: string;
  };
  authorization?: {
    id: string;
    maxAmount: number;
    usedAmount: number;
    remainingAmount: number;
    validAfter: string;
    validBefore: string;
    allowedTypes: string[];
    isActive: boolean;
  } | null;
}

interface AuthorizationPanelProps {
  agentId: string;
  agentName: string;
  scaAddress?: string;
  onAuthorizationChange?: () => void;
}

export default function AuthorizationPanel({
  agentId,
  agentName,
  scaAddress,
  onAuthorizationChange,
}: AuthorizationPanelProps) {
  const { wallet } = useUser();
  const address = wallet?.address;
  // Get provider from window.ethereum or EIP-6963
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get provider from EIP-6963 or window.ethereum
      const ethereum = (window as any).ethereum;
      if (ethereum) {
        setProvider(ethereum);
      }
    }
  }, []);
  const [status, setStatus] = useState<AuthorizationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  
  // Form state
  const [maxAmount, setMaxAmount] = useState('100');
  const [validDuration, setValidDuration] = useState('24'); // hours
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['transfer_usdc', 'pay_for_service']);

  // Fetch authorization status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/authorize`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch authorization status:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle type toggle
  const toggleType = (type: string) => {
    setAllowedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Handle authorization
  const handleAuthorize = async () => {
    if (!address || !provider || !scaAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (allowedTypes.length === 0) {
      alert('Please select at least one allowed operation type');
      return;
    }

    setAuthorizing(true);

    try {
      // Generate authorization message
      const authMessage = generateAuthorizationMessage(
        scaAddress,
        parseFloat(maxAmount),
        parseInt(validDuration),
        [] // Function selectors will be derived from allowedTypes
      );

      // Request user signature
      const { signature, authorization } = await signAuthorization(
        provider,
        address,
        authMessage
      );

      // Submit to backend
      const response = await fetch(`/api/agents/${agentId}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxAmountUsdc: parseFloat(maxAmount),
          validDurationHours: parseInt(validDuration),
          allowedTypes,
          signature,
          nonce: authorization.nonce,
        }),
      });

      if (response.ok) {
        alert('Authorization successful!');
        fetchStatus();
        onAuthorizationChange?.();
      } else {
        const error = await response.json();
        alert(`Authorization failed: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Authorization error:', error);
      alert(`Authorization failed: ${error.message}`);
    } finally {
      setAuthorizing(false);
    }
  };

  // Handle revoke
  const handleRevoke = async () => {
    if (!status?.authorization?.id) return;

    if (!confirm('Are you sure you want to revoke this authorization?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/agents/${agentId}/authorize?authorizationId=${status.authorization.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        alert('Authorization revoked');
        fetchStatus();
        onAuthorizationChange?.();
      } else {
        const error = await response.json();
        alert(`Revoke failed: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Revoke error:', error);
      alert(`Revoke failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">Loading authorization status...</p>
      </div>
    );
  }

  if (!scaAddress) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
        <p className="text-yellow-400">
          This agent does not have a Smart Contract Account yet.
          Please create one first to enable on-chain operations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">
          Agent Authorization
        </h3>
        <span className="text-sm text-gray-400">
          SCA: {scaAddress.slice(0, 6)}...{scaAddress.slice(-4)}
        </span>
      </div>

      {/* Current Status */}
      {status?.authorization && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Current Authorization</span>
            <span className={`px-2 py-1 rounded text-xs ${
              status.authorization.isActive 
                ? 'bg-green-600 text-green-100' 
                : 'bg-red-600 text-red-100'
            }`}>
              {status.authorization.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Max Amount</p>
              <p className="text-white font-medium">{status.authorization.maxAmount} USDC</p>
            </div>
            <div>
              <p className="text-gray-400">Used Amount</p>
              <p className="text-white font-medium">{status.authorization.usedAmount} USDC</p>
            </div>
            <div>
              <p className="text-gray-400">Remaining</p>
              <p className="text-green-400 font-medium">{status.authorization.remainingAmount} USDC</p>
            </div>
            <div>
              <p className="text-gray-400">Expires</p>
              <p className="text-white font-medium">
                {new Date(status.authorization.validBefore).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-1">Allowed Operations</p>
            <div className="flex flex-wrap gap-2">
              {status.authorization.allowedTypes.map((type) => (
                <span 
                  key={type}
                  className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded text-xs"
                >
                  {type.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleRevoke}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Revoke Authorization
          </button>
        </div>
      )}

      {/* Balance */}
      {status?.balance && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">OKB Balance</p>
            <p className="text-white text-lg font-medium">{status.balance.okb}</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">USDC Balance</p>
            <p className="text-white text-lg font-medium">{status.balance.usdc}</p>
          </div>
        </div>
      )}

      {/* New Authorization Form */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">
          {status?.authorization ? 'Update Authorization' : 'Create Authorization'}
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Max Amount (USDC)
            </label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Valid Duration (hours)
            </label>
            <input
              type="number"
              value={validDuration}
              onChange={(e) => setValidDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="24"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">
            Allowed Operations
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'transfer_usdc', label: 'USDC Transfer' },
              { key: 'pay_for_service', label: 'Pay for Service' },
              { key: 'transfer_okb', label: 'OKB Transfer' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  allowedTypes.includes(key)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAuthorize}
          disabled={authorizing || allowedTypes.length === 0}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            authorizing || allowedTypes.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {authorizing ? 'Authorizing...' : 'Authorize Agent'}
        </button>

        <p className="text-xs text-gray-500">
          By authorizing, you allow {agentName} to execute the selected operations
          on your behalf up to the specified amount. You can revoke this at any time.
        </p>
      </div>
    </div>
  );
}
