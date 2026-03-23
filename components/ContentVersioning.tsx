import React, { useState } from 'react';
import { generateImageWithReference } from '../services/geminiService';
import { brandConfig } from '../config';
import { Upload, X, RotateCcw } from 'lucide-react';

const BRAND_BLACK = "#111827"; // Brand Black
const BRAND_ACCENT = "#0077C8";

export const ContentVersioning: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedDeals, setGeneratedDeals] = useState<string[]>([]);

  React.useEffect(() => {
    const loadDefaultImage = async () => {
      try {
        const response = await fetch('/images/qvc-ad.png');
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

  React.useEffect(() => {
    if (generatedDeals.length > 0) {
      fetch('/api/save-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureId: 'content_versioning',
          data: {
            uploadedImage,
            generatedDeals
          }
        })
      }).catch(err => console.error("Failed to save run to server:", err));
    }
  }, [generatedDeals, uploadedImage]);

  const loadLastRun = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/load-run/content_versioning');
      if (!response.ok) throw new Error("No saved run");
      
      const data = await response.json();
      
      if (data.uploadedImage) setUploadedImage(data.uploadedImage);
      if (data.generatedDeals) setGeneratedDeals(data.generatedDeals);
      
    } catch (error) {
      console.warn("Could not load last run:", error);
      alert("No previous run found.");
    } finally {
      setLoading(false);
    }
  };

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
      const prompt = `
      Create a high-quality variation of the provided input advertisement.
      
      CONTEXT:
      The image should be a faithful recreation of the input advertisement, adapted to the target aspect ratio.
      Maintain the overarching theme, visual style, and aesthetic of the input image.
      The lighting, color palette, and overall vibe MUST remain consistent with the original.
      
      TEXT REPLICATION:
      CRITICAL: You MUST maintain 100% accuracy of all text found in the original advertisement.
      The text placement, font weights, and typographic hierarchy should feel native to the new aspect ratio.
      Do not add new text or calls to action.
      
      BRANDING:
      Maintain any logos or brand elements exactly as they appear in the input image, adjusted proportionately for the new aspect ratio.`;

      const aspectRatios = ["1:1", "4:3", "16:9", "9:16", "3:2", "2:3", "4:5", "5:4", "21:9", "4:1"];
      const promises = aspectRatios.map(ratio => generateImageWithReference(prompt, uploadedImage, "image/jpeg", "gemini-3.1-flash-image-preview", ratio));
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="section-header !mb-0">Content Versioning</h2>
        <button
          onClick={loadLastRun}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm font-medium"
        >
          <RotateCcw size={16} /> Load Last
        </button>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-xl font-semibold text-gray-900">Generating 10 Variations...</p>
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

          <button
            onClick={handleGenerateDeal}
            disabled={!uploadedImage || loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg btn-primary px-6 py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6`}
          >
            Generate 10 Options
          </button>
        </div>

        {/* Right Col: Output */}
        <div className="lg:col-span-2 space-y-6">
          {generatedDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedDeals.map((dealUrl, index) => {
                const ratios = [
                  "1:1 (Square)", "4:3 (Classic)", "16:9 (Landscape)", "9:16 (Vertical)", 
                  "3:2 (Standard)", "2:3 (Portrait)", "4:5 (Social)", "5:4 (Social)", 
                  "21:9 (Cinematic)", "4:1 (Banner)"
                ];
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
