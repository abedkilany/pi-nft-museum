"use client";

import { useEffect, useRef } from "react";

export default function AuthSessionBridge() {
  const hasRun = useRef(false);

  useEffect(() => {
    // منع التشغيل أكثر من مرة
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      try {
        // 🔹 إذا عندك token مخزن → لا تعيد login
        const existingToken = localStorage.getItem("authToken");

        if (existingToken) {
          console.log("🟢 Already authenticated → skip Pi login");
          return;
        }

        console.log("🟡 No token → starting Pi authentication");

        // @ts-ignore
        if (!window.Pi) {
          console.log("❌ Pi SDK not found");
          return;
        }

        // @ts-ignore
        const scopes = ["username", "payments"];

        // @ts-ignore
        const auth = await window.Pi.authenticate(scopes);

        if (!auth?.accessToken) {
          console.log("❌ No accessToken");
          return;
        }

        console.log("✅ Pi auth success");

        // إرسال للسيرفر
        const res = await fetch("/api/auth/pi/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: auth.accessToken,
          }),
        });

        const data = await res.json();

        if (!data?.token) {
          console.log("❌ No app token returned");
          return;
        }

        // 🔥 تخزين التوكن
        localStorage.setItem("authToken", data.token);

        console.log("✅ App session created");

        // redirect مرة واحدة فقط
        window.location.href = "/admin";

      } catch (err) {
        console.error("❌ Auth error:", err);
      }
    };

    run();
  }, []);

  return null;
}