import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Container } from '../components/layout/Container';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { Database, FlaskConical, ShieldCheck, Home, ArrowRight, Lock } from 'lucide-react';

const portalCards = [
  {
    title: 'Data Owner Portal',
    description: 'Upload datasets and issue capabilities to researchers',
    path: '/owner',
    icon: Database,
    gradient: 'from-owner-primary to-owner-secondary',
    color: 'text-owner-primary',
  },
  {
    title: 'Researcher Portal',
    description: 'Generate ZK proofs and submit them to the blockchain',
    path: '/researcher',
    icon: FlaskConical,
    gradient: 'from-researcher-primary to-researcher-secondary',
    color: 'text-researcher-primary',
  },
  {
    title: 'Verifier Portal',
    description: 'Query and verify proof results on the blockchain',
    path: '/verifier',
    icon: ShieldCheck,
    gradient: 'from-verifier-primary to-verifier-secondary',
    color: 'text-verifier-primary',
  },
  {
    title: 'Demo: Encrypted Data',
    description: 'See what downloaded data looks like without authorization',
    path: '/unauthorized',
    icon: Lock,
    gradient: 'from-gray-600 to-gray-800',
    color: 'text-gray-700',
  },
];

export function DashboardPage() {
  return (
    <Layout>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Home className="w-10 h-10 text-gray-700" />
            <h1 className="text-4xl font-bold text-gray-900">
              ZK Medical Dataset Access System
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A zero-knowledge, capability-based access control system for medical datasets
            on Sui blockchain with Walrus protocol storage.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {portalCards.map((portal, index) => {
            const Icon = portal.icon;
            return (
              <motion.div
                key={portal.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={portal.path}>
                  <Card className="h-full hover:shadow-xl transition-shadow">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${portal.gradient} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`text-xl font-semibold ${portal.color} mb-2`}>
                      {portal.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{portal.description}</p>
                    <div className={`flex items-center ${portal.color} font-medium`}>
                      <span>Go to Portal</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Zero-knowledge proof generation</li>
                <li>• Capability-based access control</li>
                <li>• On-chain proof verification</li>
                <li>• Encrypted dataset storage</li>
                <li>• Privacy-preserving queries</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technology Stack</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Sui Blockchain</li>
                <li>• Walrus Protocol</li>
                <li>• Circom & Groth16</li>
                <li>• Zero-Knowledge Proofs</li>
                <li>• Move Smart Contracts</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </Container>
    </Layout>
  );
}
