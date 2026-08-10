SELECT username, COUNT(*) 
FROM public.students 
GROUP BY username 
HAVING COUNT(*) > 1;
