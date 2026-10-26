export const teachers = [
  { id: 't1', name: 'Ananya Sharma' }, { id: 't2', name: 'Rohan Mehta' }, { id: 't3', name: 'Priya Nair' },
  { id: 't4', name: 'Vikram Rao' }, { id: 't5', name: 'Kavita Iyer' }, { id: 't6', name: 'Arjun Kapoor' },
]
export const classes = [
  { id: 'grade-1-a', name: 'Grade 1', section: 'A', teacherId: 't1' }, { id: 'grade-1-b', name: 'Grade 1', section: 'B', teacherId: 't2' },
  { id: 'grade-2-a', name: 'Grade 2', section: 'A', teacherId: 't3' }, { id: 'grade-2-b', name: 'Grade 2', section: 'B', teacherId: 't4' },
  { id: 'grade-3-a', name: 'Grade 3', section: 'A', teacherId: 't5' }, { id: 'grade-3-b', name: 'Grade 3', section: 'B', teacherId: 't6' },
]
const names = [
 ['Aarav Sharma','Anaya Patel','Vihaan Gupta','Myra Singh','Advik Kumar','Ira Verma','Reyansh Shah','Saanvi Joshi','Kabir Das','Aadhya Rao','Arjun Nair','Diya Mehta'],
 ['Vivaan Reddy','Kiara Malhotra','Ayaan Bose','Pari Iyer','Krishna Menon','Aarohi Jain','Dhruv Sethi','Anvi Kapoor','Ishaan Roy','Navya Bhat','Rudra Sen','Sara Khanna'],
 ['Atharv Pillai','Meera Kulkarni','Shaurya Ghosh','Tara Chawla','Devansh Mishra','Riya Thomas','Yuvaan Dutta','Vanya Gill','Om Prakash','Ishita Rao','Kian Fernandes','Nisha Sood'],
 ['Aarush Banerjee','Zoya Khan','Neil Mathew','Avni Desai','Parth Trivedi','Mira Shetty','Samar Qureshi','Aisha Lal','Ritvik Paul','Tia Chandra','Veer Sinha','Amara George'],
 ['Aditya Bose','Shanaya Roy','Harsh Vora','Kiara Das','Rohan Pillai','Anika Sen','Yash Malhotra','Sia Nair','Manav Joshi','Mahi Gupta','Arnav Thomas','Veda Iyer'],
 ['Pranav Kapoor','Ishani Reddy','Kartik Shah','Aanya Dutta','Siddharth Jain','Reva Menon','Aryan Chawla','Inaya Sethi','Laksh Verma','Aditi Ghosh','Kabir Mehta','Siya Fernandes'],
]
export const students = classes.flatMap((room, ci) => names[ci].map((name, i) => ({ id:`student-${ci+1}-${i+1}`, admissionNumber:`NSA-${2025001+ci*12+i}`, name, gender:i%2===0?'Male':'Female', classId:room.id, section:room.section, rollNumber:i+1 })))
