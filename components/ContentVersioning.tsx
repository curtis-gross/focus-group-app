import React, { useState } from 'react';
import { generateImageWithReference } from '../services/geminiService';
import { brandConfig } from '../config';
import { Upload, X } from 'lucide-react';

const BRAND_BLACK = "#111827"; // Brand Black
const BRAND_ACCENT = "#0077C8";

export const ContentVersioning: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tagline, setTagline] = useState("Science that empowers you");
  const [fontSettings, setFontSettings] = useState("font-family:Arial,sans-serif;font-weight:bold;");
  const [logoPlacement, setLogoPlacement] = useState('Top Right');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedDeals, setGeneratedDeals] = useState<string[]>([]);
  const [bgMode, setBgMode] = useState<'brand' | 'custom'>('brand');
  const [customBgPrompt, setCustomBgPrompt] = useState("A sunny outdoor park");

  React.useEffect(() => {
    const loadDefaultImage = async () => {
      try {
        const response = await fetch('/images/content_version_healthcare.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1] || base64String;
          setUploadedImage(base64Content);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error loading default image:", error);
      }
    };
    loadDefaultImage();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1] || base64String;
        setUploadedImage(base64Content);
        setGeneratedDeals([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateDeal = async () => {
    if (!uploadedImage) return;
    setLoading(true);
    setGeneratedDeals([]);

    try {
      const backgroundInstruction = bgMode === 'brand'
        ? `The background MUST be a professional ${brandConfig.companyName} style (Clean/Athletic/High Contrast). The text MUST be clear.`
        : `The background should be: ${customBgPrompt}.`;

      const logoInstruction = logoPlacement !== 'None'
        ? `Add a small, subtle ${brandConfig.companyName} logo in the ${logoPlacement}. CRITICAL: Do NOT use heavy text.`
        : "";

      const prompt = `
      Create a high-energy, commercial-grade advertisement featuring this product.
      
      CONTEXT:
      The product MUST be worn or used by a person in a dynamic, authentic setting (e.g. sprinting on a track, lifting in a gritty gym, jumping in an urban environment, hiking). 
      The person should look focused and athletic. 
      The lighting should be dramatic and cinematic (high contrast).
      ${backgroundInstruction}
      
      TEXT OVERLAY:
      The text "${tagline}" MUST be clearly integrated into the image, perhaps behind the subject or boldly in the negative space.
      Font Style: "${fontSettings}".
      The text must NOT cover the product.
      
      BRANDING:
      ${logoInstruction}

      Overall Vibe: Empowering, fast, premium, and intense.`;

      const aspectRatios = ["1:1", "16:9", "9:16", "4:3"];
      const promises = aspectRatios.map(ratio => generateImageWithReference(prompt, uploadedImage, "image/jpeg", "gemini-3-pro-image-preview", ratio));
      const results = await Promise.all(promises);

      const validResults = results
        .filter((res): res is string => res !== null)
        .map(res => `data:image/jpeg;base64,${res}`);

      setGeneratedDeals(validResults);
    } catch (error) {
      console.error("Error generating deals:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="section-header">Content Versioning</h2>

      {loading && (
        <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-xl font-semibold text-gray-900">Generating 4 Variations...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Inputs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">1. Upload Product</h3>

          {!uploadedImage ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-gray-50 mb-6 group">
              <label className="cursor-pointer flex flex-col items-center">
                <Upload size={32} className="text-gray-400 group-hover:text-blue-600 mb-2 transition-colors" />
                <span className="text-gray-500 font-medium group-hover:text-gray-900">Click to upload Product Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white mb-6 p-2">
              <img src={`data:image/jpeg;base64,${uploadedImage}`} alt="Uploaded Preview" className="w-full h-48 object-contain" />
              <button
                onClick={() => { setUploadedImage(null); setGeneratedDeals([]); }}
                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-gray-500 hover:text-red-500 transition-colors shadow-sm border border-gray-200"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <h3 className="text-lg font-semibold mb-2 text-gray-900">2. Background Style</h3>
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setBgMode('brand')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${bgMode === 'brand' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Brand Style
            </button>
            <button
              onClick={() => setBgMode('custom')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${bgMode === 'custom' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Custom
            </button>
          </div>

          {bgMode === 'custom' && (
            <textarea
              value={customBgPrompt}
              onChange={(e) => setCustomBgPrompt(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-6 h-20 resize-none placeholder-gray-400"
              placeholder="e.g. Urban running track at sunset"
            />
          )}

          <h3 className="text-lg font-semibold mb-2 text-gray-900">3. Enter Tagline</h3>
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-6 h-24 resize-none placeholder-gray-400 text-lg"
            placeholder="e.g. Science that empowers you"
          />

          <h3 className="text-lg font-semibold mb-2 text-gray-900">4. Font Settings</h3>
          <input
            type="text"
            value={fontSettings}
            onChange={(e) => setFontSettings(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-6 font-mono placeholder-gray-400"
            placeholder="e.g. font-family:Arial; font-weight:bold;"
          />

          <h3 className="text-lg font-semibold mb-2 text-gray-900">5. Logo Placement</h3>
          <select
            value={logoPlacement}
            onChange={(e) => setLogoPlacement(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-6"
          >
            <option value="Top Left">Top Left</option>
            <option value="Top Right">Top Right</option>
            <option value="Bottom Left">Bottom Left</option>
            <option value="Bottom Right">Bottom Right</option>
            <option value="None">None</option>
          </select>

          <button
            onClick={handleGenerateDeal}
            disabled={!uploadedImage || loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg btn-primary px-6 py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            Generate 4 Options
          </button>
        </div>

        {/* Right Col: Output */}
        <div className="lg:col-span-2 space-y-6">
          {generatedDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedDeals.map((dealUrl, index) => {
                const ratios = ["1:1 (Square)", "16:9 (Landscape)", "9:16 (Story)", "4:3 (Classic)"];
                return (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 tracking-wider">{ratios[index]}</h3>
                    <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center mb-3 border border-gray-200">
                      <img src={dealUrl} alt={`Generated Deal ${index + 1}`} className="max-w-full max-h-full object-contain shadow-sm" />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Powered by Gemini</span>
                      <a href={dealUrl} download={`deal-${ratios[index].split(' ')[0]}.jpg`} className="text-blue-600 font-semibold hover:underline">Download</a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 h-full min-h-[400px] flex items-center justify-center text-gray-400">
              <p>Generated images will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
