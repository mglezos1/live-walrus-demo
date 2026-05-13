import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Container } from '../components/layout/Container';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { Lock, Search } from 'lucide-react';

export function UnauthorizedDataPage() {
  const [blobId, setBlobId] = useState('');
  const [displayedBlobId, setDisplayedBlobId] = useState<string | null>(null);

  // Raw encrypted data as it appears when downloaded without authorization
  const encryptedBlocks = [
    {
      blobId: 'WvxtYhk_RLEHIDoIKQvx9wLrvkIcgdohFpl14OCxJyo',
      hexData: `7f52089c8d98950a5d3b80f98c56cbeb3638b16249e5c6a9e7dfbff1e704b80950a1408f4285daa80fb83a0819583e8f04d4fb7c76b9a0c69ee8353faed622f9e2655ec110caf6bc1c0bb68f1b256c057f2efb8c7e0b397f4ddd69d31a2b37b948b9631b2512c0a9d2a616be89ce0c579896adef1604e4e2bc46a9a2631b0c9d1067d88dd33fd23f3623bddc023dad46b878b0739c177d875e6b0491887e56f027cc9537547cb7be5d2fa4d8d1756a14e78eff59729df1c4c2131db44b90eca539adc87afc52296f14546a9d6830f1484ff7f67ae2bac0f6cc74c751e5a5316df238f0d9aa3a644a46758a3eeedd423d802a9ed347bd5f6ca815a6bed8ee43351dabd193f7dd2d17b444e80d91a5c8ee903a25af06a6aa13a42fb3ed7b7837d344d1233ea4648ef144d60b3a69908b8f72a6faae82d0e4445401794052bd946f3a3d2cc6168ab5cf625bbda921971a9ba7395147d06ed0f9e48986b439a15888632994e3c4572185ab41b84ef8c55d49229da901e0bf2a940152f4d43508b6e5a5094046b581432e6686e13787d3b70850b8aed1b823c352bf9d87d8e076addfff3ee55bee53aab5220b70061d45be77044e8a0d0c9c44c50e629628ce6f0b8723da771ca06d99d34d4b332acf4a01a2489e4d76481c59da97d0bcc808ef66`,
      size: '2.4 KB',
    },
    {
      blobId: 'Xy9zQmNkRmVnSGlqS2tsTW5vUHByc3R1dnd4eXo=',
      hexData: `4a7f3b2e1c9d8a6f5e4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2`,
      size: '1.8 KB',
    },
    {
      blobId: 'QWJjZGVmZ2hpams=',
      hexData: `6c9f5d4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6`,
      size: '3.1 KB',
    },
  ];

  const handleSearch = () => {
    if (blobId.trim()) {
      setDisplayedBlobId(blobId.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Find matching block or generate random encrypted data for any blob ID
  const getEncryptedData = (id: string) => {
    const found = encryptedBlocks.find(b => b.blobId === id);
    if (found) {
      return [found];
    }
    // Generate random-looking encrypted data for any blob ID
    return [{
      blobId: id,
      hexData: Array.from({ length: 512 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(''),
      size: `${(Math.random() * 3 + 1).toFixed(1)} KB`,
    }];
  };

  // Format hex data with line breaks every 80 characters
  const formatHex = (hex: string) => {
    return hex.match(/.{1,80}/g)?.join('\n') || hex;
  };

  const blocksToShow = displayedBlobId ? getEncryptedData(displayedBlobId) : [];

  return (
    <Layout gradient="verifier">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Downloaded Data (Unauthorized)
            </h1>
          </div>

          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter blob ID..."
                value={blobId}
                onChange={(e) => setBlobId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900"
            >
              <Search className="w-4 h-4 mr-2" />
              Load Data
            </Button>
          </div>
        </motion.div>

        {displayedBlobId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {blocksToShow.map((block, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-mono">Blob ID: {block.blobId}</span>
                  <span className="text-gray-500 text-xs">{block.size}</span>
                </div>
                
                <div className="bg-black rounded p-3 overflow-x-auto">
                  <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {formatHex(block.hexData)}
                  </pre>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!displayedBlobId && (
          <div className="text-center text-gray-500 py-12">
            <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Enter a blob ID to view encrypted data</p>
          </div>
        )}
      </Container>
    </Layout>
  );
}
