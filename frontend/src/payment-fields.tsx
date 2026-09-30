import { useState } from 'react';
import { Field } from './components';
import { money } from './api';
export function PaymentFields({ amount }: { amount?: number }) {
  const [method, setMethod] = useState('CASH');
  const [cash, setCash] = useState('');
  return <>
    <Field label="Forma de pago *"><select name="paymentMethod" value={method} onChange={e => setMethod(e.target.value)}>
      <option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="MIXED">Efectivo + transferencia</option>
    </select></Field>
    {method === 'MIXED' && <Field label="Importe en efectivo *" hint={amount !== undefined ? `Total ${money(amount)} · Transferencia ${money(Math.max(0, amount - Number(cash)))}` : 'El resto del total se registra como transferencia.'}>
      <input name="cashAmount" type="number" min="0.01" max={amount !== undefined ? Math.round((amount - .01) * 100) / 100 : undefined} step="0.01" required value={cash} onChange={e => setCash(e.target.value)} />
    </Field>}
  </>;
}
