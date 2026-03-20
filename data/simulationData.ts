  // Sample Products / Plans
export const SIMULATION_PRODUCTS = [
  "Complete Care PPO: Comprehensive coverage with broad network access and low out-of-pocket costs.",
  "Premium Advantage Freedom: All-in-one plan including prescription drugs, dental, vision, and hearing.",
  "Community HMO: Affordable, community-focused plan with coordinated care teams.",
  "Network Focused EPO: Network-focused plan designed for cost savings and high-quality local care.",

  // Wellness & Prevention
  "Wellness Rewards Program: Earn points for preventive screenings, flu shots, and gym visits.",
  "Telehealth 24/7: On-demand access to doctors for minor health concerns from home.",
  "Chronic Care Management: Personalized support for diabetes, heart disease, and other chronic conditions.",
  "Maternity Care Coordination: Guided support for expectant mothers from prenatal to postpartum.",

  // Fitness & Lifestyle
  "SilverSneakers Membership: Free gym access and fitness classes for seniors.",
  "Blue365 Discounts: Exclusive deals on fitness gear, nutrition plans, and healthy lifestyle products.",
  "Digital Health Coaching: Personalized coaching for weight loss, smoking cessation, and stress management.",
  "Mental Health Support: Access to therapy, counseling, and digital mental health tools.",

  // Pharmacy & Ancillary
  "Prescription Mail Order: 90-day supply of maintenance medications delivered to your door.",
  "Blue Edge Dental: Comprehensive dental coverage for checkups, cleanings, and major work.",
  "Blue Edge Vision: Vision coverage including eye exams, glasses, and contacts."
];

export const STANDARD_AUDIENCES = [
  {
    id: 'std_skeptic',
    name: 'Skeptic',
    personaName: 'Rational Evaluator',
    bio: 'Highly critical of insurance costs and coverage. meticulously reads the fine print. Needs clear proof of value and ROI.',
    demographics: '45-60, Suburban, Value-Conscious',
    details: {
      age: 52,
      job_title: 'Accountant',
      bio: 'Believes most insurance is a scam. Wants to see exactly what is covered.',
      income: 'Medium-High',
      lifestyle_tags: ['Financial Planner', 'Skeptic', 'Detail-Oriented']
    },
    imagePrompt: 'Portrait of a serious individual reviewing documents with a magnifying glass, thoughtful expression, home office',
    imageUrl: '/images/personas/skeptic.jpg',
    isStandard: true
  },
  {
    id: 'std_optimist',
    name: 'Optimist',
    personaName: 'Wellness Advocate',
    bio: 'Proactive about health. Uses every benefit, tracks steps, gets all screenings. Loves preventive care rewards.',
    demographics: '30-45, Urban, Active',
    details: {
      age: 35,
      job_title: 'Yoga Instructor',
      bio: 'Views insurance as a partner in health. Loves the rewards program.',
      income: 'Medium',
      lifestyle_tags: ['Wellness', 'Active', 'Preventive Care']
    },
    imagePrompt: 'Portrait of a healthy, energetic person in activewear, holding a smoothie, sunny park background',
    imageUrl: '/images/personas/superfan.jpg',
    isStandard: true
  },
  {
    id: 'std_average_jane',
    name: 'Average Jane',
    personaName: 'Practical Parent',
    bio: 'Needs coverage for the whole family but is on a tight budget. worried about deductibles and copays.',
    demographics: '35-50, Suburban, Family-Oriented',
    details: {
      age: 40,
      job_title: 'Teacher',
      bio: 'Needs surety that a broken arm wont break the bank.',
      income: 'Low-Medium',
      lifestyle_tags: ['Family First', 'Budget Aware', 'Safety Net']
    },
    imagePrompt: 'Portrait of a smiling parent with two children, casual setting, warm lighting',
    imageUrl: '/images/personas/budget.jpg',
    isStandard: true
  }
];
