import { useEffect, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

function CardSetupForm({ clientSecret, onVerified }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError('');

    const result = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message || 'Card verification failed.');
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:5000/api/payments/confirm-setup', {
        setup_intent_id: result.setupIntent.id,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onVerified();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save verified card.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <div className="alert alert-danger" style={{ marginTop: '1rem' }}>{error}</div>}
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="submit"
        className="btn btn-accent"
        style={{ width: '100%', marginTop: '1rem' }}
        disabled={!stripe || submitting}
      >
        {submitting ? 'Verifying...' : 'Verify Card'}
      </motion.button>
    </form>
  );
}

function PaymentVerification({ onVerified }) {
  const [config, setConfig] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSetup = async () => {
      try {
        const token = localStorage.getItem('token');
        const configRes = await axios.get('http://127.0.0.1:5000/api/payments/config');
        setConfig(configRes.data);

        if (!configRes.data.stripe_enabled && !configRes.data.razorpay_enabled) {
          setError('Payments are not configured yet. Please contact admin.');
          return;
        }

        const setupRes = await axios.post('http://127.0.0.1:5000/api/payments/setup-intent', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProviderData(setupRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not start verification.');
      } finally {
        setLoading(false);
      }
    };

    loadSetup();
  }, []);

  const handleRazorpayVerify = () => {
    const options = {
      key: config.razorpay_key_id,
      amount: providerData.amount,
      currency: providerData.currency,
      name: "Atomicbid Verification",
      description: "Secure card verification",
      order_id: providerData.order_id,
      handler: async (response) => {
        try {
          const token = localStorage.getItem('token');
          await axios.post('http://127.0.0.1:5000/api/payments/confirm-setup', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('Payment verified successfully!');
          onVerified();
        } catch (err) {
          toast.error('Verification failed on our server.');
        }
      },
      prefill: {
        name: JSON.parse(localStorage.getItem('user') || '{}').username,
        email: JSON.parse(localStorage.getItem('user') || '{}').email
      },
      theme: {
        color: "#9ceb6d"
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (loading) {
    return <div className="owner-note">Preparing secure verification...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="glass-card interactive-surface" style={{ marginTop: '1rem' }}>
      <div className="eyebrow">Required before bidding</div>
      <h3 style={{ marginBottom: '0.5rem' }}>Verify payment method</h3>
      <p className="section-copy" style={{ marginBottom: '1.5rem' }}>
        Atomicbid verifies your payment method now to ensure a secure bidding experience.
      </p>
      
      {providerData?.provider === 'razorpay' ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleRazorpayVerify}
          className="btn btn-accent"
          style={{ width: '100%' }}
        >
          Verify with Razorpay (₹1)
        </motion.button>
      ) : providerData?.provider === 'stripe' ? (
        <Elements 
          stripe={loadStripe(config.publishable_key)} 
          options={{ clientSecret: providerData.client_secret, appearance: { theme: 'stripe' } }}
        >
          <CardSetupForm onVerified={onVerified} />
        </Elements>
      ) : (
        <div className="alert alert-danger">No payment provider available.</div>
      )}
    </div>
  );
}

export default PaymentVerification;
