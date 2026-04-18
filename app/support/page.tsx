'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className=" backdrop-blur-xl border  rounded-3xl p-8 md:p-12 glass relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64  rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12  rounded-2xl flex items-center justify-center border ">
              
            </div>
            <h1 className="text-3xl font-bold  font-['Tajawal']">الدعم الفني</h1>
          </div>

          {submitted ? (
            <div className="text-center py-12">
              
              <h2 className="text-2xl font-bold  mb-4 font-['Tajawal']">تم إرسال رسالتك بنجاح</h2>
              <p className=" mb-8 font-['Tajawal']">سيتواصل معك فريق الدعم في أقرب وقت ممكن عبر بريدك الإلكتروني.</p>
              <Link href="/" className="px-8 py-3   font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']">
                العودة للرئيسية
              </Link>
            </div>
          ) : (
            <>
              <p className=" mb-8 font-['Tajawal'] leading-relaxed">
                هل لديك استفسار أو واجهت مشكلة في المنصة؟ فريق دعم نيكسوس هنا لمساعدتك على مدار الساعة.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium  mb-2 font-['Tajawal']">الاسم الكامل</label>
                    <input 
                      type="text" 
                      required
                      className="w-full  border  rounded-xl px-4 py-3  focus:outline-none focus: font-['Tajawal']"
                      placeholder="أدخل اسمك"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium  mb-2 font-['Tajawal']">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      required
                      className="w-full  border  rounded-xl px-4 py-3  focus:outline-none focus: "
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium  mb-2 font-['Tajawal']">نوع المشكلة</label>
                  <select className="w-full  border  rounded-xl px-4 py-3  focus:outline-none focus: font-['Tajawal']">
                    <option>مشكلة في الدفع / المحفظة</option>
                    <option>مشكلة في حجز الاستشارات</option>
                    <option>مشكلة تقنية في الموقع</option>
                    <option>اقتراح أو ملاحظات</option>
                    <option>أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium  mb-2 font-['Tajawal']">الرسالة</label>
                  <textarea 
                    required
                    rows={5}
                    className="w-full  border  rounded-xl px-4 py-3  focus:outline-none focus: font-['Tajawal'] resize-none"
                    placeholder="اشرح لنا كيف يمكننا مساعدتك..."
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4   font-bold rounded-2xl hover:shadow-[0_0_30px_#00f2ff] transition-all font-['Tajawal'] text-lg"
                >
                  إرسال الرسالة
                </button>
              </form>

              <div className="mt-12 pt-8 border-t  grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  
                  <p className="text-xs  ">support@nexus.com</p>
                </div>
                <div className="text-center">
                  
                  <p className="text-xs  ">+966 500 000 000</p>
                </div>
                <div className="text-center">
                  
                  <p className="text-xs  font-['Tajawal']">الرياض، المملكة العربية السعودية</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
