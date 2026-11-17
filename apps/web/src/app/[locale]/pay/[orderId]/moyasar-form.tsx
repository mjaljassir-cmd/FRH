"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Moyasar?: { init: (cfg: Record<string, unknown>) => void };
  }
}

const VERSION = "1.15.0";

export function MoyasarForm(props: {
  amount: number;
  description: string;
  publishableKey: string;
  callbackUrl: string;
  orderId: string;
  locale: string;
  applePayLabel: string;
}) {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `https://cdn.moyasar.com/mpf/${VERSION}/moyasar.css`;
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = `https://cdn.moyasar.com/mpf/${VERSION}/moyasar.js`;
    script.onload = () => {
      window.Moyasar?.init({
        element: ".mysr-form",
        amount: props.amount,
        currency: "SAR",
        description: props.description,
        publishable_api_key: props.publishableKey,
        callback_url: props.callbackUrl,
        language: props.locale,
        methods: ["creditcard", "stcpay", "applepay"],
        supported_networks: ["mada", "visa", "mastercard"],
        metadata: { order_id: props.orderId },
        apple_pay: {
          country: "SA",
          label: props.applePayLabel,
          validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
        },
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
      css.remove();
    };
  }, [props]);
  return <div className="mysr-form" />;
}
