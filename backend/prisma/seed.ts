import { PrismaClient, InternshipMode, InternshipStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

// This seeder is idempotent and safe to re-run. It guarantees that exactly
// one permanent, protected Super Admin account exists, using the credentials
// supplied via environment variables (see backend/.env.example).
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'rajendranallapareddy9515@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Rajendra@9515';
  const fullName = process.env.SUPER_ADMIN_NAME || 'AskItSuperAdmin';
  const mobileNumber = process.env.SUPER_ADMIN_MOBILE || '9515154709';

  const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', isProtected: true } });

  if (existing) {
    console.log(`✔ Protected Super Admin already exists (${existing.email}). Skipping creation.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    const superAdmin = await prisma.user.create({
      data: {
        fullName,
        email,
        mobileNumber,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true,
        isProtected: true,
      },
    });
    console.log(`✔ Created permanent Super Admin: ${superAdmin.email}`);
    console.log(`  Login with the password set in SUPER_ADMIN_PASSWORD (see .env).`);
  }

  // Seed a handful of realistic courses if none exist yet, so the public site
  // isn't empty on first run.
  const courseCount = await prisma.course.count();
  if (courseCount === 0) {
    await prisma.course.createMany({
      data: [
        {
          title: 'Azure Cloud Computing',
          slug: 'azure-cloud-computing',
          category: 'Cloud',
          description:
            'Master Microsoft Azure from fundamentals to administration and DevOps, with hands-on labs on real cloud infrastructure.',
          duration: '3-4 Months',
          syllabus: ['Azure Fundamentals', 'Azure Administration', 'Azure DevOps', 'and more'],
        },
        {
          title: 'Java Full Stack Development',
          slug: 'java-full-stack-development',
          category: 'Development',
          description:
            'Build production-grade web applications with Core Java, Spring Boot, and modern front-end technologies.',
          duration: '3-4 Months',
          syllabus: ['Core Java', 'Spring Boot', 'HTML, CSS, JS', 'and more'],
        },
        {
          title: 'Python Full Stack Development',
          slug: 'python-full-stack-development',
          category: 'Development',
          description:
            'Go from Python fundamentals to Django/Flask web development and REST APIs used in real-world products.',
          duration: '3-4 Months',
          syllabus: ['Core Python', 'Django / Flask', 'HTML, CSS, JS', 'React / Angular'],
        },
        {
          title: '.NET with Java Development',
          slug: 'dotnet-development',
          category: 'Development',
          description:
            'Develop enterprise applications with the .NET Framework/Core, ASP.NET MVC, and Java integration patterns.',
          duration: '3-4 Months',
          syllabus: ['.NET Framework / Core', 'ASP.NET / MVC', 'Java Integration', 'and more'],
        },
        {
          title: 'SQL Database Development',
          slug: 'sql-database-development',
          category: 'Database',
          description:
            'Learn database design, advanced SQL, SQL Server administration, and performance tuning used by real companies.',
          duration: '3-4 Months',
          syllabus: ['SQL Basics', 'Advanced SQL', 'SQL Server', 'Performance Tuning'],
        },
        {
          title: 'AWS & GCP Cloud Technologies',
          slug: 'aws-gcp-cloud-technologies',
          category: 'Cloud',
          description:
            'Get hands-on with AWS essentials, Google Cloud fundamentals, and real cloud project deployments.',
          duration: '3-4 Months',
          syllabus: ['AWS Essentials', 'GCP Fundamentals', 'Cloud Projects', 'and more'],
        },
      ],
    });
    console.log('✔ Seeded 6 starter courses.');
  }

  // Seed a handful of ready-to-register internships if none exist yet — added
  // so the Internships page and payment checkout have real data to test
  // against immediately, without needing to hand-create one first.
  const internshipCount = await prisma.internship.count();
  if (internshipCount === 0) {
    console.log('📚 Creating starter internships...');

    const now = new Date();
    const internships = [
      {
        title: 'Full Stack Web Development',
        slug: 'full-stack-web-development',
        description:
          'Build real-world web applications using React, Node.js, and PostgreSQL. Master frontend and backend development with hands-on projects and expert mentorship.',
        duration: '3 Months',
        startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 97 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        totalSeats: 30,
        mode: InternshipMode.ONLINE,
        status: InternshipStatus.OPEN,
        fee: 14999,
        gstPercentage: 18,
      },
      {
        title: 'Data Science & Machine Learning',
        slug: 'data-science-ml',
        description:
          'Master data analysis, machine learning, and AI with Python. Work on real datasets and build predictive models using industry-standard tools.',
        duration: '4 Months',
        startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 134 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        totalSeats: 25,
        mode: InternshipMode.ONLINE,
        status: InternshipStatus.OPEN,
        fee: 19999,
        gstPercentage: 18,
      },
      {
        title: 'UI/UX Design',
        slug: 'ui-ux-design',
        description:
          'Learn design thinking, user research, wireframing, and prototyping. Create beautiful and user-friendly interfaces with industry-standard tools.',
        duration: '2 Months',
        startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 81 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(now.getTime() + 19 * 24 * 60 * 60 * 1000),
        totalSeats: 20,
        mode: InternshipMode.HYBRID,
        status: InternshipStatus.OPEN,
        fee: 9999,
        gstPercentage: 18,
      },
      {
        title: 'Digital Marketing',
        slug: 'digital-marketing',
        description:
          'Master SEO, Social Media Marketing, Content Strategy, and Analytics. Run live campaigns and measure real results with industry experts.',
        duration: '3 Months',
        startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        totalSeats: 25,
        mode: InternshipMode.OFFLINE,
        status: InternshipStatus.OPEN,
        fee: 12999,
        gstPercentage: 18,
      },
      {
        title: 'Mobile App Development (React Native)',
        slug: 'react-native-mobile-app',
        description:
          'Build cross-platform mobile apps using React Native. Learn to deploy to both iOS and Android app stores with real-world projects.',
        duration: '3 Months',
        startDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 118 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(now.getTime() + 26 * 24 * 60 * 60 * 1000),
        totalSeats: 20,
        mode: InternshipMode.ONLINE,
        status: InternshipStatus.OPEN,
        fee: 17999,
        gstPercentage: 18,
      },
      {
        title: 'DevOps & Cloud Computing',
        slug: 'devops-cloud',
        description:
          'Learn DevOps practices, CI/CD pipelines, Docker, Kubernetes, and AWS cloud deployment. Master modern infrastructure management.',
        duration: '4 Months',
        startDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 155 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000),
        totalSeats: 15,
        mode: InternshipMode.ONLINE,
        status: InternshipStatus.OPEN,
        fee: 21999,
        gstPercentage: 18,
      },
    ];

    for (const internship of internships) {
      try {
        await prisma.internship.create({ data: internship });
        console.log(`✅ Created internship: ${internship.title}`);
      } catch (error) {
        console.error(`❌ Failed to create internship ${internship.title}:`, error);
      }
    }

    console.log(`🎉 Successfully created ${internships.length} internships!`);
  } else {
    console.log(`✔ ${internshipCount} internships already exist. Skipping internship seed.`);
  }

  // Seed a default PaymentSettings singleton row so the admin Payment
  // Settings page has sane defaults on first load.
  const settingsCount = await prisma.paymentSettings.count();
  if (settingsCount === 0) {
    await prisma.paymentSettings.create({ data: { id: 'singleton', gstPercentage: 18, currency: 'INR' } });
    console.log('✔ Seeded default payment settings (18% GST, INR).');
  }

  console.log('\n✨ Seed complete!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
