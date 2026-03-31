import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CreditCard, Truck, Lock, CheckCircle, Smartphone, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, paymentAPI } from '../api/index';
import { formatPrice, loadRazorpay, primaryImage } from '../utils/helpers';
import styles from './Checkout.module.css';

const SHIPPING_THRESHOLD = 999;
const SHIPPING_CHARGE    = 99;

export default function Checkout() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { cart, subtotal, clearCart } = useCart();

  const [payMethod,       setPayMethod]       = useState('razorpay');
  const [upiDiscountPct,  setUpiDiscountPct]  = useState(5);
  const [placing,         setPlacing]         = useState(false);
  const [step,            setStep]            = useState(1);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      fullName: user?.name || '', phone: '',
      street: '', city: '', state: '', postalCode: '', country: 'India',
    },
  });

  // Fetch UPI discount % from backend
  useEffect(() => {
    orderAPI.getUpiDiscount()
      .then(({ data }) => setUpiDiscountPct(data.upiDiscountPercent))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cart?.items?.length) navigate('/cart');
  }, [cart]);

  const discount       = cart?.appliedCoupon?.discountAmount || 0;
  const shipping       = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_CHARGE;
  const afterCoupon    = subtotal - discount;
  const upiSaving      = payMethod === 'upi' ? Math.round((afterCoupon * upiDiscountPct) / 100) : 0;
  const total          = Math.max(0, subtotal - discount - upiSaving + shipping);

  // ── COD ───────────────────────────────────────────────────────────────────────
  const handleCOD = async (addr) => {
    setPlacing(true);
    try {
      const { data } = await orderAPI.create({
        shippingAddress: addr,
        paymentMethod: 'cod',
        couponCode: cart?.appliedCoupon?.code,
      });
      await clearCart();
      toast.success('Order placed! Pay on delivery.');
      navigate('/order-success/' + data.order._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order.');
    } finally { setPlacing(false); }
  };

  // ── Razorpay / UPI ────────────────────────────────────────────────────────────
  const handleOnlinePayment = async (addr) => {
    setPlacing(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Failed to load payment gateway.'); setPlacing(false); return; }

      // Create order on backend (with UPI discount baked into total)
      const { data: orderData } = await orderAPI.create({
        shippingAddress: addr,
        paymentMethod:   payMethod,   // 'razorpay' or 'upi'
        couponCode:      cart?.appliedCoupon?.code,
      });
      const order = orderData.order;

      const { data: rzpData } = await paymentAPI.createRazorpayOrder(order._id);

      const options = {
        key:         rzpData.keyId,
        amount:      rzpData.amount,
        currency:    rzpData.currency,
        name:        'DRIP Store',
        description: 'Order #' + rzpData.orderNumber,
        order_id:    rzpData.razorpayOrderId,
        prefill: {
          name:    rzpData.prefill.name,
          email:   rzpData.prefill.email,
          contact: addr.phone,
        },
        // Pre-select UPI method if user chose UPI
        ...(payMethod === 'upi' && {
          method: { upi: true, card: false, netbanking: false, wallet: false },
        }),
        theme:  { color: '#1a1a1a' },
        modal:  { escape: false },

        handler: async (response) => {
          try {
            await paymentAPI.verify({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order._id,
            });
            await clearCart();
            toast.success('Payment successful!');
            navigate('/order-success/' + order._id);
          } catch {
            toast.error('Payment verification failed. Contact support.');
            navigate('/orders');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (response) => {
        await paymentAPI.failed({
          orderId: order._id,
          razorpayOrderId: rzpData.razorpayOrderId,
          error: response.error,
        });
        toast.error('Payment failed: ' + response.error.description);
        setPlacing(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
      setPlacing(false);
    }
  };

  const onSubmit = (data) => {
    const addr = {
      fullName: data.fullName, phone: data.phone,
      street: data.street, city: data.city,
      state: data.state, postalCode: data.postalCode, country: data.country,
    };
    if (payMethod === 'cod') handleCOD(addr);
    else handleOnlinePayment(addr);
  };

  return (
    <div className="section">
      <div className="container">
        <h1 className="page-title" style={{ marginBottom: '2rem' }}>Checkout</h1>

        <div className={styles.layout}>
          {/* ── Form ── */}
          <div>
            {/* Steps */}
            <div className={styles.steps}>
              {[{ n: 1, label: 'Shipping' }, { n: 2, label: 'Payment' }].map(({ n, label }) => (
                <div key={n} className={`${styles.step} ${step >= n ? styles.stepActive : ''}`}>
                  <div className={styles.stepNum}>
                    {step > n ? <CheckCircle size={14} /> : n}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* ── Step 1: Address ── */}
              <div className={`${styles.formCard} ${step !== 1 ? styles.collapsed : ''}`}>
                <h2 className={styles.formTitle}>Shipping Address</h2>
                <div className={styles.formGrid}>
                  <div className={`form-group ${styles.full}`}>
                    <label className="form-label">Full Name *</label>
                    <input className={`form-input ${errors.fullName ? 'error' : ''}`}
                      placeholder="John Doe"
                      {...register('fullName', { required: 'Full name is required' })} />
                    {errors.fullName && <p className="form-error">{errors.fullName.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input className={`form-input ${errors.phone ? 'error' : ''}`}
                      placeholder="9XXXXXXXXX" type="tel"
                      {...register('phone', {
                        required: 'Phone is required',
                        pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
                      })} />
                    {errors.phone && <p className="form-error">{errors.phone.message}</p>}
                  </div>
                  <div className={`form-group ${styles.full}`}>
                    <label className="form-label">Street Address *</label>
                    <input className={`form-input ${errors.street ? 'error' : ''}`}
                      placeholder="Flat / House No., Street, Area"
                      {...register('street', { required: 'Street address is required' })} />
                    {errors.street && <p className="form-error">{errors.street.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input className={`form-input ${errors.city ? 'error' : ''}`}
                      placeholder="Mumbai"
                      {...register('city', { required: 'City is required' })} />
                    {errors.city && <p className="form-error">{errors.city.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input className={`form-input ${errors.state ? 'error' : ''}`}
                      placeholder="Maharashtra"
                      {...register('state', { required: 'State is required' })} />
                    {errors.state && <p className="form-error">{errors.state.message}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input className={`form-input ${errors.postalCode ? 'error' : ''}`}
                      placeholder="400001" maxLength={6}
                      {...register('postalCode', {
                        required: 'Pincode is required',
                        pattern: { value: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' },
                      })} />
                    {errors.postalCode && <p className="form-error">{errors.postalCode.message}</p>}
                  </div>
                </div>
                <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }}
                  onClick={() => setStep(2)}>
                  Continue to Payment →
                </button>
              </div>

              {/* ── Step 2: Payment ── */}
              {step === 2 && (
                <div className={styles.formCard}>
                  <h2 className={styles.formTitle}>Payment Method</h2>

                  <div className={styles.payMethods}>
                    {/* UPI — highlighted as best deal */}
                    <label className={`${styles.payOption} ${payMethod === 'upi' ? styles.payActive : ''}`}>
                      <input type="radio" name="pay" value="upi"
                        checked={payMethod === 'upi'}
                        onChange={() => setPayMethod('upi')} />
                      <Smartphone size={20} color="#7c3aed" />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <p className={styles.payLabel}>UPI Payment</p>
                          <span className={styles.discountTag}>
                            <Zap size={10} /> {upiDiscountPct}% OFF
                          </span>
                        </div>
                        <p className={styles.payDesc}>
                          GPay, PhonePe, Paytm, BHIM — Save {formatPrice(Math.round((afterCoupon * upiDiscountPct) / 100))} on this order
                        </p>
                      </div>
                    </label>

                    {/* Razorpay (cards, netbanking) */}
                    <label className={`${styles.payOption} ${payMethod === 'razorpay' ? styles.payActive : ''}`}>
                      <input type="radio" name="pay" value="razorpay"
                        checked={payMethod === 'razorpay'}
                        onChange={() => setPayMethod('razorpay')} />
                      <CreditCard size={20} />
                      <div>
                        <p className={styles.payLabel}>Card / Net Banking / Wallet</p>
                        <p className={styles.payDesc}>Credit card, Debit card, Net Banking via Razorpay</p>
                      </div>
                    </label>

                    {/* COD */}
                    <label className={`${styles.payOption} ${payMethod === 'cod' ? styles.payActive : ''}`}>
                      <input type="radio" name="pay" value="cod"
                        checked={payMethod === 'cod'}
                        onChange={() => setPayMethod('cod')} />
                      <Truck size={20} />
                      <div>
                        <p className={styles.payLabel}>Cash on Delivery</p>
                        <p className={styles.payDesc}>Pay when your order arrives</p>
                      </div>
                    </label>
                  </div>

                  {payMethod === 'upi' && (
                    <div className={styles.upiSavingsBanner}>
                      🎉 You're saving <strong>{formatPrice(upiSaving)}</strong> by paying via UPI!
                    </div>
                  )}

                  <div className={styles.secureNote}>
                    <Lock size={13} />
                    <span>All payments are encrypted and secure</span>
                  </div>

                  <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                      ← Back
                    </button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={placing}>
                      {placing ? 'Processing…'
                        : payMethod === 'cod'
                          ? 'Place Order — ' + formatPrice(total)
                          : 'Pay ' + formatPrice(total)}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* ── Summary ── */}
          <div className={styles.summary}>
            <h3 className={styles.summaryTitle}>Order Summary</h3>
            <div className={styles.summaryItems}>
              {cart?.items?.map((item) => {
                const name = typeof item.product === 'object' ? item.product?.name : 'Product';
                const img  = typeof item.product === 'object' ? primaryImage(item.product?.images) : '';
                return (
                  <div key={item._id} className={styles.summaryItem}>
                    <div className={styles.summaryImgWrap}>
                      <img src={img || 'https://placehold.co/60x75?text=?'} alt={name}
                        onError={(e) => { e.target.src = 'https://placehold.co/60x75?text=?'; }} />
                      <span className={styles.qtyBadge}>{item.quantity}</span>
                    </div>
                    <div className={styles.summaryItemInfo}>
                      <p>{name}</p>
                      {item.size && <p className={styles.meta}>{item.size}</p>}
                    </div>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                );
              })}
            </div>

            <div className="divider" />

            <div className={styles.rows}>
              <div className={styles.row}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {discount > 0 && (
                <div className={`${styles.row} ${styles.green}`}>
                  <span>Coupon Discount</span><span>−{formatPrice(discount)}</span>
                </div>
              )}
              {upiSaving > 0 && (
                <div className={`${styles.row} ${styles.purple}`}>
                  <span>⚡ UPI Discount ({upiDiscountPct}%)</span>
                  <span>−{formatPrice(upiSaving)}</span>
                </div>
              )}
              <div className={styles.row}>
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className={styles.green}>Free</span> : formatPrice(shipping)}</span>
              </div>
            </div>

            <div className="divider" />
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            {upiSaving > 0 && (
              <p className={styles.savingsNote}>
                You save {formatPrice(upiSaving)} with UPI! 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}