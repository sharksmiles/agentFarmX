'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Service {
  id: string;
  serviceType: string;
  name: string;
  description: string | null;
  priceUsdc: number;
  durationMinutes: number | null;
  totalOrders: number;
  completedOrders: number;
  rating: number;
  agent: {
    id: string;
    name: string;
    scaAddress: string;
    successRate: number;
    user?: {
      username: string | null;
      avatar: string | null;
    };
  };
}

interface ServiceMarketPanelProps {
  agentId: string;
  onServicePurchase?: (serviceId: string) => void;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  harvest: 'Harvest Service',
  water: 'Water Service',
  guard: 'Guard Service',
  boost: 'Boost Service',
};

export default function ServiceMarketPanel({
  agentId,
  onServicePurchase,
}: ServiceMarketPanelProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create service form
  const [newService, setNewService] = useState({
    serviceType: 'harvest',
    name: '',
    description: '',
    priceUsdc: '',
    durationMinutes: '',
  });
  const [creating, setCreating] = useState(false);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType) params.append('serviceType', selectedType);
      if (maxPrice) params.append('maxPrice', maxPrice);
      params.append('limit', '20');

      const response = await fetch(`/api/agents/services?${params}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, maxPrice]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Create service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/agents/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          serviceType: newService.serviceType,
          name: newService.name,
          description: newService.description,
          priceUsdc: parseFloat(newService.priceUsdc),
          durationMinutes: newService.durationMinutes ? parseInt(newService.durationMinutes) : null,
        }),
      });

      if (response.ok) {
        alert('Service created successfully!');
        setShowCreateForm(false);
        setNewService({
          serviceType: 'harvest',
          name: '',
          description: '',
          priceUsdc: '',
          durationMinutes: '',
        });
        fetchServices();
      } else {
        const error = await response.json();
        alert(`Failed to create service: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Create service error:', error);
      alert(`Failed to create service: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Purchase service
  const handlePurchase = async (service: Service) => {
    if (!confirm(`Purchase "${service.name}" for ${service.priceUsdc} USDC?`)) {
      return;
    }

    try {
      // This would call the Agent's skill to pay for the service
      // For now, we'll just show a message
      alert(`Service purchase initiated. Your agent will execute the payment.`);
      onServicePurchase?.(service.id);
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`Purchase failed: ${error.message}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">
          Agent Service Market
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Offer Service'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedType === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {Object.entries(SERVICE_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max price (USDC)"
          className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none w-40"
        />
      </div>

      {/* Create Service Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateService} className="bg-gray-700 rounded-lg p-4 space-y-4">
          <h4 className="text-lg font-medium text-white">Create New Service</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Service Type</label>
              <select
                value={newService.serviceType}
                onChange={(e) => setNewService({ ...newService, serviceType: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(SERVICE_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Price (USDC)</label>
              <input
                type="number"
                step="0.01"
                value={newService.priceUsdc}
                onChange={(e) => setNewService({ ...newService, priceUsdc: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="0.05"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Service Name</label>
            <input
              type="text"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="My Awesome Service"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Description</label>
            <textarea
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              rows={2}
              placeholder="Describe what this service offers..."
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Duration (minutes, optional)</label>
            <input
              type="number"
              value={newService.durationMinutes}
              onChange={(e) => setNewService({ ...newService, durationMinutes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="60"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              creating
                ? 'bg-gray-500 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {creating ? 'Creating...' : 'Create Service'}
          </button>
        </form>
      )}

      {/* Services List */}
      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No services available</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-gray-700 rounded-lg p-4 space-y-3 hover:bg-gray-650 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">{service.name}</h4>
                  <p className="text-sm text-gray-400">
                    {SERVICE_TYPE_LABELS[service.serviceType] || service.serviceType}
                  </p>
                </div>
                <span className="text-green-400 font-semibold">
                  {service.priceUsdc} USDC
                </span>
              </div>

              {service.description && (
                <p className="text-gray-400 text-sm line-clamp-2">
                  {service.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-white">{service.rating.toFixed(1)}</span>
                </div>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">
                  {service.completedOrders} orders
                </span>
                {service.durationMinutes && (
                  <>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">
                      ~{service.durationMinutes}min
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                <div className="flex items-center gap-2">
                  {service.agent.user?.avatar ? (
                    <Image
                      src={service.agent.user.avatar}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-600 rounded-full" />
                  )}
                  <span className="text-gray-300 text-sm">
                    {service.agent.name}
                  </span>
                </div>
                <button
                  onClick={() => handlePurchase(service)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Purchase
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
