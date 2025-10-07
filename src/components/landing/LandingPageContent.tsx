"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  RiRocketLine, 
  RiFocus3Line, 
  RiCalendarLine, 
  RiBarChartLine,
  RiTimerLine,
  RiCheckboxCircleLine,
  RiTeamLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiLightbulbLine,
  RiTrophyLine,
  RiArrowRightLine,
  RiStarFill,
  RiDoubleQuotesL,
  RiPlayCircleLine,
  RiDashboardLine,
  RiMenuLine,
  RiCloseLine
} from "react-icons/ri";

import LanguageToggle from "@/components/ui/languages/LanguageToggle";
import { useLanguage } from "@/stores/languageStore";
import Image from "next/image";

export default function LandingPageContent() {
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Image
                  src="/images/logo/logo-icon.svg"
                  alt="Logo"
                  width={48}
                  height={48}
                  priority
                />
              </div>
              <span className="text-xl font-bold text-gray-900">Better Planner</span>
            </div>
            
            {/* Desktop Navigation - Absolutely Centered */}
            <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">{t.nav.features}</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">{t.nav.testimonials}</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">{t.nav.pricing}</a>
            </div>
            
            {/* Desktop Auth & Language */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageToggle 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
              />
              <Link 
                href="/signin" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t.nav.signIn}
              </Link>
              <Link 
                href="/signup" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t.nav.getStarted}
              </Link>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <RiCloseLine className="w-6 h-6" />
              ) : (
                <RiMenuLine className="w-6 h-6" />
              )}
            </button>
          </div>
          
          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {/* Mobile Navigation Links */}
                <a
                  href="#features"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t.nav.features}
                </a>
                <a
                  href="#testimonials"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t.nav.testimonials}
                </a>
                <a
                  href="#pricing"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t.nav.pricing}
                </a>
                
                {/* Mobile Language Toggle */}
                <div className="px-3 py-2">
                  <LanguageToggle 
                    currentLanguage={language} 
                    onLanguageChange={setLanguage} 
                  />
                </div>
                
                {/* Mobile Auth Links */}
                <div className="px-3 py-2 space-y-2">
                  <Link
                    href="/signin"
                    className="block w-full text-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t.nav.signIn}
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center px-4 py-2 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t.nav.getStarted}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-8">
              <RiRocketLine className="w-4 h-4 mr-2" />
              {t.hero.badge}
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t.hero.title.stop}
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t.hero.title.start}
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t.hero.description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link 
                href="/signup" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center group"
              >
                {t.hero.cta.getStarted}
                <RiArrowRightLine className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              {/* <button className="flex items-center text-gray-600 hover:text-gray-900 transition-colors group">
                <RiPlayCircleLine className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
                {t.hero.cta.watchDemo}
              </button> */}
            </div>
            
            {/* Hero Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">10,000+</div>
                <div className="text-gray-600">{t.hero.stats.users}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">40%</div>
                <div className="text-gray-600">{t.hero.stats.productivity}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">4.9/5</div>
                <div className="text-gray-600">{t.hero.stats.rating}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.features.description}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Strategic Planning */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RiFocus3Line className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.features.items.strategicPlanning.title}</h3>
              <p className="text-gray-600 mb-4">
                {t.features.items.strategicPlanning.description}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                {t.features.items.strategicPlanning.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <RiCheckboxCircleLine className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Task Management */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RiCalendarLine className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.features.items.taskManagement.title}</h3>
              <p className="text-gray-600 mb-4">
                {t.features.items.taskManagement.description}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                {t.features.items.taskManagement.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <RiCheckboxCircleLine className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Analytics & Insights */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RiBarChartLine className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.features.items.analytics.title}</h3>
              <p className="text-gray-600 mb-4">
                {t.features.items.analytics.description}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                {t.features.items.analytics.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <RiCheckboxCircleLine className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pomodoro Timer */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RiTimerLine className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.features.items.pomodoro.title}</h3>
              <p className="text-gray-600 mb-4">
                {t.features.items.pomodoro.description}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                {t.features.items.pomodoro.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <RiCheckboxCircleLine className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Real-time Collaboration */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RiTeamLine className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.features.items.collaboration.title}</h3>
              <p className="text-gray-600 mb-4">
                {t.features.items.collaboration.description}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                {t.features.items.collaboration.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <RiCheckboxCircleLine className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Security & Privacy */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RiShieldCheckLine className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.features.items.security.title}</h3>
              <p className="text-gray-600 mb-4">
                {t.features.items.security.description}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                {t.features.items.security.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <RiCheckboxCircleLine className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-900 to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t.benefits.title}
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t.benefits.description}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <RiTrophyLine className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{t.benefits.items.provenResults.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t.benefits.items.provenResults.description}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <RiCheckboxCircleLine className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{t.benefits.items.simpleIntuitive.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t.benefits.items.simpleIntuitive.description}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <RiSmartphoneLine className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{t.benefits.items.worksEverywhere.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t.benefits.items.worksEverywhere.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t.testimonials.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.testimonials.description}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <RiStarFill key={i} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              <RiDoubleQuotesL className="w-8 h-8 text-blue-600 mb-4" />
              <p className="text-gray-700 mb-6">
                "{t.testimonials.items.sarah.quote}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  SM
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{t.testimonials.items.sarah.name}</div>
                  <div className="text-gray-600 text-sm">{t.testimonials.items.sarah.role}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <RiStarFill key={i} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              <RiDoubleQuotesL className="w-8 h-8 text-blue-600 mb-4" />
              <p className="text-gray-700 mb-6">
                "{t.testimonials.items.david.quote}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  DL
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{t.testimonials.items.david.name}</div>
                  <div className="text-gray-600 text-sm">{t.testimonials.items.david.role}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <RiStarFill key={i} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              <RiDoubleQuotesL className="w-8 h-8 text-blue-600 mb-4" />
              <p className="text-gray-700 mb-6">
                "{t.testimonials.items.mike.quote}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  MR
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{t.testimonials.items.mike.name}</div>
                  <div className="text-gray-600 text-sm">{t.testimonials.items.mike.role}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {t.cta.title}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t.cta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/signup" 
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center group"
            >
              {t.cta.getStarted}
              <RiArrowRightLine className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/signin" 
              className="text-white border-2 border-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200"
            >
              {t.cta.signIn}
            </Link>
          </div>
          <p className="text-blue-100 text-sm mt-4">
            {t.cta.disclaimer}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Image
                    src="/images/logo/logo-icon.svg"
                    alt="Logo"
                    width={48}
                    height={48}
                    priority
                  />
                </div>
                <span className="text-xl font-bold">Better Planner</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                {t.footer.description}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.footer.product.title}</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">{t.footer.product.features}</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">{t.footer.product.pricing}</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t.footer.product.updates}</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t.footer.product.roadmap}</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.footer.support.title}</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t.footer.support.helpCenter}</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t.footer.support.contactUs}</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t.footer.support.community}</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t.footer.support.status}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
