import React, { useState } from 'react';
import { PDPEnrichment } from './PDPEnrichment';
import { MultiImage } from './MultiImage';
import { PDPPersonalization } from './PDPPersonalization';
import { ESpots } from './ESpots';
import { ContentVersioning } from './ContentVersioning';
import { GenSiteStub } from './GenSiteStub';
import { ProductSpin } from './ProductSpin';
import { GenerateNewProduct } from './GenerateNewProduct';
import { ImagePlus, Heart, Sparkles, Target, Tag, Globe, Video, Layers } from 'lucide-react';


export const PDPHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PERSONALIZATION' | 'ENRICHMENT' | 'ESPOTS' | 'CONTENT_VERSIONING' | 'GENSITE' | 'MULTI_IMAGE' | 'PRODUCT_SPIN' | 'NEW_PRODUCT'>('PERSONALIZATION');

    return (
        <div className="app-container flex-col w-full">
            {/* Top Bar */}
            <div className="page-header">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Layers className="text-[#0077C8]" size={24} />
                            <h1 className="page-title">Content Studio</h1>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="tab-scroll-container">
                        <button
                            onClick={() => setActiveTab('PERSONALIZATION')}
                            className={`tab-button ${activeTab === 'PERSONALIZATION' ? 'active' : 'inactive'}`}
                        >
                            <Heart size={18} /> PDP Personalization
                        </button>
                        <button
                            onClick={() => setActiveTab('MULTI_IMAGE')}
                            className={`tab-button ${activeTab === 'MULTI_IMAGE' ? 'active' : 'inactive'}`}
                        >
                            <ImagePlus size={18} /> Multi Image
                        </button>


                        <button
                            onClick={() => setActiveTab('CONTENT_VERSIONING')}
                            className={`tab-button ${activeTab === 'CONTENT_VERSIONING' ? 'active' : 'inactive'}`}
                        >
                            <Layers size={18} /> Content Versions
                        </button>
                        <button
                            onClick={() => setActiveTab('PRODUCT_SPIN')}
                            className={`tab-button ${activeTab === 'PRODUCT_SPIN' ? 'active' : 'inactive'}`}
                        >
                            <Video size={18} /> Product Spin
                        </button>

                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'MULTI_IMAGE' && <MultiImage />}
                    {activeTab === 'PERSONALIZATION' && <PDPPersonalization />}
                    {activeTab === 'NEW_PRODUCT' && <GenerateNewProduct />}
                    {activeTab === 'ESPOTS' && <ESpots />}
                    {activeTab === 'ENRICHMENT' && <PDPEnrichment />}
                    {activeTab === 'CONTENT_VERSIONING' && <ContentVersioning />}
                    {activeTab === 'PRODUCT_SPIN' && <ProductSpin />}

                </div>
            </div>
        </div>
    );
};
