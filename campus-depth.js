const q = (id, competency, difficulty, prompt, options, answer, explanation, keywords = [], prerequisites = []) => ({
  id,
  track: 'campus',
  competency,
  difficulty,
  prompt,
  options,
  answer,
  explanation,
  keywords,
  prerequisites,
})

function rotate(question, offset = 0) {
  const options = [...question.options]
  const shift = ((offset % options.length) + options.length) % options.length
  if (!shift) return question
  const rotated = [...options.slice(shift), ...options.slice(0, shift)]
  const answerText = options[question.answer]
  return { ...question, options: rotated, answer: rotated.indexOf(answerText) }
}

function quantitativeQuestions() {
  const out = []
  const percentages = [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50]
  percentages.forEach((pct, index) => {
    const base = 400 + index * 80
    const increase = base * pct / 100
    const total = base + increase
    const item = q(
      `camp-depth-quant-pct-${index + 1}`,
      'Quantitative aptitude',
      index < 4 ? 'foundation' : 'core',
      `A value increases from ${base} to ${total}. What is the percentage increase?`,
      [`${Math.max(1, pct - 5)}%`, `${pct}%`, `${pct + 5}%`, `${pct + 10}%`],
      1,
      `Increase = ${increase}; ${increase} ÷ ${base} × 100 = ${pct}%.`,
      ['aptitude', 'quantitative', 'percentage', 'numerical'],
    )
    out.push(rotate(item, index % 4))
  })
  ;[
    [12,18,36,7.2],[8,12,24,4.8],[10,15,30,6],[16,24,48,9.6],[20,30,60,12],[6,9,18,3.6],
  ].forEach(([a,b,lcm,answer], index) => {
    const rate = 1/a + 1/b
    const exact = Number((1/rate).toFixed(1))
    const item = q(`camp-depth-quant-work-${index+1}`,'Quantitative aptitude','core',`A can complete a task in ${a} days and B in ${b} days. About how many days will they take working together?`,[String(Math.max(1,exact-2)),String(exact),String(exact+2),String(a+b)],1,`Combined rate = 1/${a} + 1/${b}; reciprocal gives about ${exact} days.`,['aptitude','quantitative','time','work'])
    out.push(rotate(item,(index+1)%4))
  })
  ;[
    [40,50,60],[55,65,75],[72,80,88],[30,45,60],[18,24,30],[90,100,110],
  ].forEach((values,index)=>{
    const avg=(values[0]+values[1]+values[2])/3
    const item=q(`camp-depth-quant-avg-${index+1}`,'Quantitative aptitude','foundation',`What is the average of ${values.join(', ')}?`,[String(avg-5),String(avg),String(avg+5),String(avg+10)],1,`Average = (${values.join(' + ')}) ÷ 3 = ${avg}.`,['aptitude','quantitative','average'])
    out.push(rotate(item,(index+2)%4))
  })
  return out
}

function logicalQuestions() {
  const out=[]
  const starts=[1,2,3,4,5,6,7,8]
  starts.forEach((start,index)=>{
    const seq=[start,start+3,start+8,start+15,start+24]
    const next=start+35
    const item=q(`camp-depth-reason-seq-${index+1}`,'Logical reasoning','foundation',`Find the next number: ${seq.join(', ')}, ?`,[String(next-4),String(next),String(next+2),String(next+5)],1,'The differences are 3, 5, 7, 9, so the next difference is 11.',['reasoning','logical','sequence'])
    out.push(rotate(item,index%4))
  })
  const syllogisms=[
    ['All testers are engineers. Some engineers are mentors.','Some testers are mentors','No conclusion about whether any tester is a mentor follows'],
    ['All databases are systems. Some systems are distributed.','Some databases are distributed','No conclusion about whether any database is distributed follows'],
    ['All routers are network devices. Some network devices are wireless.','Some routers are wireless','No conclusion about whether any router is wireless follows'],
    ['All interns are employees. Some employees are remote.','Some interns are remote','No conclusion about whether any intern is remote follows'],
    ['All arrays are collections. Some collections are immutable.','Some arrays are immutable','No conclusion about whether any array is immutable follows'],
    ['All APIs are interfaces. Some interfaces are public.','Some APIs are public','No conclusion about whether any API is public follows'],
  ]
  syllogisms.forEach(([premise,tempting,correct],index)=>{
    const item=q(`camp-depth-reason-syll-${index+1}`,'Logical reasoning','core',`${premise} Which conclusion is guaranteed?`,[tempting,correct,'All members of the first group belong to the second subset','The two groups cannot overlap'],1,'The premises do not establish that the first group intersects the stated subset.',['reasoning','logical','syllogism'])
    out.push(rotate(item,(index+1)%4))
  })
  return out
}

const fixed = [
  q('camp-depth-program-1','Programming fundamentals','foundation','In most zero-based languages, what is the index of the first element in an array?',['0','1','-1','Depends on array length'],0,'Zero-based indexing starts at 0.',['programming','arrays','fundamentals']),
  q('camp-depth-program-2','Programming fundamentals','core','A loop runs for i = 0 while i < 5 and increments i by 1. How many iterations execute?',['4','5','6','Infinite'],1,'The loop executes for i values 0,1,2,3,4.',['programming','loops']),
  q('camp-depth-program-3','Programming fundamentals','core','What does a function return immediately when a return statement executes?',['Control and the specified value to the caller','Only a log message','A new thread','A database row'],0,'Return ends the current function invocation and passes a value/control to the caller.',['programming','functions']),
  q('camp-depth-program-4','Programming fundamentals','foundation','Which construct is best suited for choosing between two mutually exclusive branches?',['if/else','array','import','comment'],0,'if/else expresses conditional branching.',['programming','conditionals']),
  q('camp-depth-program-5','Programming fundamentals','core','What is the main risk of using an array index equal to array.length in a zero-based array?',['It refers past the last valid element','It always returns the first element','It sorts the array','It changes the array type'],0,'The last valid index is array.length - 1.',['programming','arrays','bounds']),
  q('camp-depth-program-6','Programming fundamentals','core','Why is a local variable generally safer than unnecessary global mutable state?',['It reduces unintended coupling between code paths','It guarantees O(1) runtime','It prevents all bugs','It removes the need for functions'],0,'Narrow scope reduces accidental dependencies and side effects.',['programming','scope','fundamentals']),
  q('camp-depth-program-7','Programming fundamentals','foundation','Which value is typically used to represent a true/false condition?',['Boolean','Array','Socket','Class loader'],0,'Boolean values model true/false conditions.',['programming','boolean']),
  q('camp-depth-program-8','Programming fundamentals','core','What is the purpose of a base case in a recursive function?',['Stop the recursion under a defined condition','Make recursion infinite','Allocate a database','Sort input automatically'],0,'A base case provides the termination condition.',['programming','recursion']),
  q('camp-depth-program-9','Programming fundamentals','core','What does pass-by-value mean conceptually?',['The function receives its own value copy/reference value rather than the caller variable itself','Every object is deep-cloned','Arguments are ignored','The caller cannot observe any mutation ever'],0,'The parameter receives a value; exact object semantics depend on the language.',['programming','parameters']),
  q('camp-depth-program-10','Programming fundamentals','foundation','Which operator is commonly used to test equality in many programming languages?',['== or === depending on language','=','+=','++ only'],0,'Equality comparison uses comparison operators rather than assignment.',['programming','operators']),
  q('camp-depth-program-11','Programming fundamentals','core','Why should input be validated before indexing or parsing it?',['To prevent invalid assumptions from causing errors','To make the CPU faster','To avoid declaring variables','To guarantee network access'],0,'Validation checks assumptions before unsafe operations.',['programming','validation']),
  q('camp-depth-program-12','Programming fundamentals','core','What is the main benefit of breaking a large procedure into small functions?',['Clearer responsibilities and easier testing','Guaranteed constant memory','No need for inputs','Automatic parallelism'],0,'Small focused functions improve readability, reuse, and testability.',['programming','functions','testing']),

  q('camp-depth-problem-1','Problem solving','core','Before coding a solution, what should you do if the input constraints are unclear?',['Clarify assumptions and constraints','Guess silently','Ignore edge cases','Choose the longest algorithm'],0,'Constraints determine valid approaches and complexity requirements.',['problem','coding','communication']),
  q('camp-depth-problem-2','Problem solving','core','Your solution works on the sample but fails on an empty input. What is the best next action?',['Add and reason about boundary tests','Delete the empty test','Assume empty input never occurs','Rewrite in another language immediately'],0,'Boundary cases should be handled explicitly.',['problem','testing','edge case']),
  q('camp-depth-problem-3','Problem solving','core','Two approaches are correct, one O(n²) and one O(n). What should guide the choice?',['Input constraints and tradeoffs','Variable names only','Which has more lines','Random choice'],0,'Complexity matters relative to expected input size and constraints.',['problem','complexity']),
  q('camp-depth-problem-4','Problem solving','foundation','What is a useful first step after reproducing a bug reliably?',['Reduce it to the smallest failing case','Add unrelated features','Change every dependency','Delete logs'],0,'A minimal reproduction isolates the cause.',['problem','debugging']),
  q('camp-depth-problem-5','Problem solving','core','A requirement says values may contain duplicates. What should your algorithm do?',['Handle duplicates explicitly','Assume uniqueness','Drop repeated values silently','Fail every duplicate input'],0,'Correctness must respect stated input conditions.',['problem','assumptions']),
  q('camp-depth-problem-6','Problem solving','core','When a result looks wrong, which debugging technique is most useful first?',['Trace intermediate state against a small known example','Optimize before checking correctness','Remove tests','Increase timeout'],0,'Tracing a small case helps locate where behavior diverges.',['problem','debugging']),
  q('camp-depth-problem-7','Problem solving','core','What makes an interview solution easier to evaluate?',['Explaining invariants, complexity, and edge cases','Coding silently','Avoiding examples','Using global variables'],0,'Clear reasoning lets the evaluator verify correctness.',['problem','communication']),
  q('camp-depth-problem-8','Problem solving','foundation','If a task asks only whether an item exists, what should you avoid doing unnecessarily?',['Computing unrelated extra output','Checking membership','Returning a boolean','Reading the input'],0,'Solve the required problem without unnecessary work.',['problem','requirements']),
  q('camp-depth-problem-9','Problem solving','core','Why create a few hand-worked examples before coding?',['They expose assumptions and expected transitions','They guarantee all tests pass','They remove complexity concerns','They replace implementation'],0,'Examples validate understanding before implementation.',['problem','examples']),
  q('camp-depth-problem-10','Problem solving','core','A solution uses extra memory to become much faster. How should you discuss it?',['State the time-space tradeoff','Hide the memory use','Claim both are free','Avoid complexity analysis'],0,'Good solutions communicate explicit tradeoffs.',['problem','complexity','memory']),
  q('camp-depth-problem-11','Problem solving','core','What should happen if a proposed optimization changes correctness for edge cases?',['Reject or redesign the optimization','Keep it because it is faster','Remove edge cases','Change expected outputs'],0,'Correctness is required before optimization.',['problem','correctness']),
  q('camp-depth-problem-12','Problem solving','foundation','What is the best reason to name variables by meaning rather than x1/x2 everywhere?',['It makes reasoning and review easier','It changes asymptotic complexity','It compiles faster','It prevents recursion'],0,'Meaningful names reduce cognitive load and errors.',['problem','readability']),

  q('camp-depth-algo-1','Algorithms','foundation','Binary search requires which key precondition?',['Data ordered by the searched key','A linked list only','Duplicate-free values','A hash table'],0,'Binary search relies on ordered data to discard half the range.',['algorithm','binary search']),
  q('camp-depth-algo-2','Algorithms','core','What is the time complexity of binary search on an array?',['O(log n)','O(n)','O(n log n)','O(1) for all inputs'],0,'The search interval is halved each step.',['algorithm','complexity']),
  q('camp-depth-algo-3','Algorithms','core','Which traversal naturally finds the shortest path in an unweighted graph?',['Breadth-first search','Depth-first search always','Insertion sort','Binary search'],0,'BFS explores by distance layers in an unweighted graph.',['algorithm','graph','bfs']),
  q('camp-depth-algo-4','Algorithms','foundation','Which sorting algorithm repeatedly selects the smallest remaining element?',['Selection sort','Merge sort','Binary search','DFS'],0,'Selection sort selects the next minimum each pass.',['algorithm','sorting']),
  q('camp-depth-algo-5','Algorithms','core','Merge sort has a typical worst-case complexity of:',['O(n log n)','O(n²)','O(log n)','O(1)'],0,'Merge sort divides and merges across logarithmic levels with linear work per level.',['algorithm','sorting','complexity']),
  q('camp-depth-algo-6','Algorithms','core','What technique avoids recomputing overlapping recursive subproblems?',['Memoization','Randomization only','Full scanning','Polling'],0,'Memoization caches solved subproblems.',['algorithm','dynamic programming','memoization']),
  q('camp-depth-algo-7','Algorithms','core','A two-pointer technique is especially useful when:',['The structure/order lets two indices move systematically toward a condition','Every input requires recursion','Only hashes are allowed','There is no sequence'],0,'Two pointers exploit ordered or structured traversal.',['algorithm','two pointers']),
  q('camp-depth-algo-8','Algorithms','core','What does a greedy algorithm do?',['Makes a locally best choice at each step under a justified strategy','Tries every possible solution always','Uses no data structures','Guarantees correctness for every problem'],0,'Greedy methods rely on problem-specific properties that make local choices globally valid.',['algorithm','greedy']),
  q('camp-depth-algo-9','Algorithms','foundation','What does Big-O primarily describe?',['Growth of resource use as input grows','Exact CPU cycles','Programming language syntax','Database schema'],0,'Big-O describes asymptotic growth.',['algorithm','complexity']),
  q('camp-depth-algo-10','Algorithms','core','Which technique is commonly used for contiguous subarray/window problems?',['Sliding window','Tree rotation only','Topological sort only','Heapify every element'],0,'Sliding windows maintain a moving contiguous range efficiently.',['algorithm','sliding window']),
  q('camp-depth-algo-11','Algorithms','core','Topological sorting applies to:',['Directed acyclic graphs','Any cyclic undirected graph only','Arrays only','Hash maps only'],0,'A topological order exists for DAGs.',['algorithm','graph','dag']),
  q('camp-depth-algo-12','Algorithms','advanced','Dijkstra’s algorithm assumes what about edge weights in its standard form?',['They are non-negative','They are all equal to zero','They are strings','The graph has no vertices'],0,'Standard Dijkstra is correct with non-negative edge weights.',['algorithm','graph','dijkstra']),

  q('camp-depth-ds-1','Data structures','foundation','Which structure follows LIFO order?',['Stack','Queue','Heap','Graph'],0,'A stack is last-in, first-out.',['data structure','stack']),
  q('camp-depth-ds-2','Data structures','foundation','Which structure follows FIFO order?',['Queue','Stack','Set','Tree'],0,'A queue is first-in, first-out.',['data structure','queue']),
  q('camp-depth-ds-3','Data structures','core','Which structure offers average O(1) key lookup?',['Hash map','Linked list','Unsorted array scan','Binary tree without ordering'],0,'Hash tables provide average constant-time key lookup.',['data structure','hash']),
  q('camp-depth-ds-4','Data structures','core','A min-heap lets you efficiently access:',['The minimum element','The median always','Every sorted element in O(1)','The last inserted element only'],0,'A min-heap keeps the minimum at the root.',['data structure','heap']),
  q('camp-depth-ds-5','Data structures','core','What is a key advantage of a linked list over a contiguous array for known-node insertion?',['No shifting of following elements','Constant-time random indexing','Lower memory in every case','Automatic sorting'],0,'Known-node insertion can relink pointers without shifting contiguous elements.',['data structure','linked list']),
  q('camp-depth-ds-6','Data structures','foundation','A binary tree node has at most how many children?',['2','1','3','Unlimited'],0,'Binary trees allow at most two children per node.',['data structure','tree']),
  q('camp-depth-ds-7','Data structures','core','Which structure is useful for implementing undo operations?',['Stack','Queue only','Set only','Graph only'],0,'Undo naturally reverses the most recent action first.',['data structure','stack']),
  q('camp-depth-ds-8','Data structures','core','Which structure is commonly used for BFS?',['Queue','Stack only','Heap only','Trie only'],0,'BFS processes discovered nodes in FIFO order.',['data structure','queue','bfs']),
  q('camp-depth-ds-9','Data structures','core','What does a set primarily guarantee conceptually?',['Membership without duplicate elements','Sorted order always','Index-based duplicates','FIFO ordering'],0,'Sets model unique membership.',['data structure','set']),
  q('camp-depth-ds-10','Data structures','core','A trie is especially useful for:',['Prefix-based string lookup','Matrix multiplication only','CPU scheduling','Transaction commits'],0,'Tries organize strings by prefixes.',['data structure','trie','string']),
  q('camp-depth-ds-11','Data structures','core','In a balanced BST, search is typically:',['O(log n)','O(n²)','O(1) guaranteed','O(2^n)'],0,'Balanced height is logarithmic.',['data structure','tree','complexity']),
  q('camp-depth-ds-12','Data structures','foundation','Which structure directly models pairwise connections between entities?',['Graph','Scalar','String only','Stack only'],0,'Graphs model vertices and edges.',['data structure','graph']),

  q('camp-depth-oop-1','Object-oriented programming','foundation','Encapsulation means:',['Bundling state with behavior behind an interface','Copying every object','Avoiding methods','Using only global variables'],0,'Encapsulation groups data and operations with controlled access.',['oop','encapsulation']),
  q('camp-depth-oop-2','Object-oriented programming','core','Polymorphism allows:',['A common interface to support different concrete behaviors','Only one class in a program','No method calls','All fields to be public'],0,'Polymorphism lets different implementations satisfy a common contract.',['oop','polymorphism']),
  q('camp-depth-oop-3','Object-oriented programming','foundation','Inheritance primarily models:',['An is-a relationship','A database join','A network route','A loop condition'],0,'Inheritance expresses specialization of a base type.',['oop','inheritance']),
  q('camp-depth-oop-4','Object-oriented programming','core','Composition primarily models:',['A has-a relationship','Only recursion','An SQL transaction','A process scheduler'],0,'Composition builds objects from collaborating contained objects.',['oop','composition']),
  q('camp-depth-oop-5','Object-oriented programming','core','Why program to an interface where practical?',['Reduce coupling to one implementation','Make all code static','Prevent testing','Remove abstraction'],0,'Interfaces allow implementations to vary behind a stable contract.',['oop','interface','design']),
  q('camp-depth-oop-6','Object-oriented programming','core','Method overriding occurs when:',['A subclass provides its own implementation of an inherited method','A variable changes value','A loop repeats','A query joins tables'],0,'Overriding specializes inherited behavior.',['oop','overriding']),
  q('camp-depth-oop-7','Object-oriented programming','foundation','An object is usually an instance of a:',['Class/type','Loop','Database index','Packet'],0,'Objects are runtime instances of types/classes.',['oop','class','object']),
  q('camp-depth-oop-8','Object-oriented programming','core','What is abstraction intended to do?',['Expose essential behavior while hiding unnecessary implementation detail','Expose every internal field','Duplicate all code','Prevent reuse'],0,'Abstraction separates what a component does from implementation detail.',['oop','abstraction']),
  q('camp-depth-oop-9','Object-oriented programming','core','Why prefer immutable objects in some designs?',['They reduce unexpected state changes','They always use zero memory','They remove constructors','They guarantee network reliability'],0,'Immutability simplifies reasoning about state.',['oop','immutability']),
  q('camp-depth-oop-10','Object-oriented programming','core','What problem can deep inheritance hierarchies create?',['Tight coupling and fragile behavior','Guaranteed performance','No code reuse','No methods'],0,'Deep hierarchies can make behavior difficult to reason about and change.',['oop','inheritance','design']),
  q('camp-depth-oop-11','Object-oriented programming','foundation','A constructor is commonly used to:',['Initialize a new object','Delete a database','Open every network port','Sort all arrays'],0,'Constructors establish initial object state.',['oop','constructor']),
  q('camp-depth-oop-12','Object-oriented programming','core','Dependency injection helps primarily by:',['Supplying collaborators from outside rather than hard-coding them','Eliminating objects','Making methods global','Replacing all interfaces'],0,'Externalized dependencies improve decoupling and testability.',['oop','dependency injection','design']),

  q('camp-depth-sql-1','Data & SQL','foundation','Which SQL clause filters rows before grouping?',['WHERE','ORDER BY','CREATE','COMMIT only'],0,'WHERE filters rows before later aggregation stages.',['sql','database']),
  q('camp-depth-sql-2','Data & SQL','core','Which clause filters aggregated groups?',['HAVING','WHERE only after SELECT output','DROP','VALUES'],0,'HAVING filters groups after aggregation.',['sql','database','aggregation']),
  q('camp-depth-sql-3','Data & SQL','core','What does an INNER JOIN return?',['Rows with matching join conditions on both sides','Every left row always','Only unmatched rows','No rows by definition'],0,'INNER JOIN returns matching combinations.',['sql','join']),
  q('camp-depth-sql-4','Data & SQL','core','What does a LEFT JOIN preserve?',['All rows from the left table','Only matched right rows','Only duplicates','No nulls'],0,'LEFT JOIN keeps all left rows and matches right rows when available.',['sql','join']),
  q('camp-depth-sql-5','Data & SQL','foundation','Which aggregate counts rows?',['COUNT','ALTER','UPDATE','GRANT'],0,'COUNT returns a row/value count depending on its argument.',['sql','aggregate']),
  q('camp-depth-sql-6','Data & SQL','core','Why add an index to a frequently filtered column?',['Reduce search work for suitable queries','Guarantee zero storage','Prevent all deadlocks','Replace backups'],0,'Indexes can avoid scanning every row.',['sql','index','database']),
  q('camp-depth-sql-7','Data & SQL','core','A primary key should primarily provide:',['Unique row identity','Duplicate row identity','Display formatting','Network encryption'],0,'Primary keys uniquely identify rows.',['sql','primary key']),
  q('camp-depth-sql-8','Data & SQL','core','A foreign key represents:',['A relationship to a key in another/related table','A password','A file path','A sorting algorithm'],0,'Foreign keys maintain referential relationships.',['sql','foreign key']),
  q('camp-depth-sql-9','Data & SQL','core','What does COMMIT do in a transaction?',['Makes the transaction changes durable/accepted','Always undoes changes','Drops the database','Starts DNS resolution'],0,'COMMIT finalizes the transaction.',['sql','transaction']),
  q('camp-depth-sql-10','Data & SQL','core','What does ROLLBACK do?',['Reverts uncommitted transaction changes','Creates an index','Sorts rows','Adds a column always'],0,'ROLLBACK abandons transaction changes not committed.',['sql','transaction']),
  q('camp-depth-sql-11','Data & SQL','core','Normalization is mainly used to:',['Reduce problematic redundancy and update anomalies','Encrypt every value','Guarantee fastest query always','Remove keys'],0,'Normalization organizes data to reduce redundancy/anomalies.',['sql','normalization','dbms']),
  q('camp-depth-sql-12','Data & SQL','foundation','Which clause orders a query result?',['ORDER BY','WHERE','HAVING only','INSERT'],0,'ORDER BY controls result ordering.',['sql','query']),

  q('camp-depth-os-1','Operating systems','foundation','A process is best described as:',['A running program with OS-managed state/resources','A database row','A DNS record','A source file only'],0,'A process is an execution context managed by the OS.',['operating system','process']),
  q('camp-depth-os-2','Operating systems','core','Threads within one process commonly share:',['The process address space','Separate physical machines always','Different executable files necessarily','DNS zones'],0,'Threads in a process share memory/resources while having execution state.',['operating system','thread']),
  q('camp-depth-os-3','Operating systems','core','Virtual memory gives a process:',['An abstract address space mapped by the OS/hardware','Unlimited physical RAM','A network address','A database schema'],0,'Virtual memory maps process addresses to physical/storage resources.',['operating system','memory']),
  q('camp-depth-os-4','Operating systems','core','Which is one necessary deadlock condition?',['Circular wait','All resources are infinite','No process holds resources','Only one task exists'],0,'Circular wait is one of the Coffman conditions.',['operating system','deadlock']),
  q('camp-depth-os-5','Operating systems','foundation','The scheduler primarily decides:',['Which runnable task gets CPU time','Which SQL index to create','Which DNS server exists','Which class inherits another'],0,'Scheduling allocates processor time among runnable tasks.',['operating system','scheduling']),
  q('camp-depth-os-6','Operating systems','core','A context switch changes execution from:',['One thread/process to another','HTTP to HTTPS only','One table to another','One array index to another'],0,'The OS saves/restores execution state between runnable contexts.',['operating system','context switch']),
  q('camp-depth-os-7','Operating systems','core','Paging divides virtual memory into:',['Fixed-size pages','SQL rows','Network frames only','Java classes'],0,'Paging uses fixed-size virtual pages mapped to frames.',['operating system','paging']),
  q('camp-depth-os-8','Operating systems','core','A mutex is used primarily for:',['Mutual exclusion around shared state','Sorting arrays','Resolving DNS','Compiling code'],0,'Mutexes protect critical sections from concurrent access.',['operating system','concurrency','mutex']),
  q('camp-depth-os-9','Operating systems','foundation','What does the file system manage?',['Persistent files/directories and metadata','CPU instructions only','HTTP methods','Object inheritance'],0,'File systems organize persistent storage objects.',['operating system','file system']),
  q('camp-depth-os-10','Operating systems','core','Starvation means:',['A runnable task may wait indefinitely because resources keep going elsewhere','Every task is deadlocked necessarily','Memory is encrypted','A query returns no rows'],0,'Starvation occurs when a task is continually denied needed scheduling/resources.',['operating system','scheduling','starvation']),
  q('camp-depth-os-11','Operating systems','core','A semaphore can be used to:',['Coordinate concurrent access using a counter/signaling mechanism','Parse JSON','Resolve hostnames','Build SQL indexes'],0,'Semaphores coordinate access/signaling among concurrent tasks.',['operating system','semaphore']),
  q('camp-depth-os-12','Operating systems','core','Thrashing occurs when a system spends excessive time:',['Paging/swapping rather than doing useful work','Sorting a tiny array','Resolving one DNS name','Running one function'],0,'Heavy page faults can dominate execution.',['operating system','memory','paging']),

  q('camp-depth-net-1','Networking','foundation','DNS primarily maps:',['Names to address/service information','SQL rows to tables','Classes to objects','Threads to CPU cores'],0,'DNS resolves domain names and related records.',['network','dns']),
  q('camp-depth-net-2','Networking','foundation','TCP is primarily:',['A connection-oriented reliable transport protocol','A markup language','A database engine','A sorting algorithm'],0,'TCP provides ordered reliable byte-stream transport.',['network','tcp']),
  q('camp-depth-net-3','Networking','core','HTTP status 404 means:',['Resource not found','Success','Permanent redirect','Server shutdown always'],0,'404 indicates the requested resource was not found.',['network','http']),
  q('camp-depth-net-4','Networking','core','HTTPS protects HTTP traffic using:',['TLS','SQL','DNS only','A heap'],0,'HTTPS is HTTP over TLS.',['network','https','tls']),
  q('camp-depth-net-5','Networking','core','What does an IP address identify for routing purposes?',['A network interface/host location in an IP network','A Java class','A database transaction','A file extension'],0,'IP addresses are used to route packets through IP networks.',['network','ip']),
  q('camp-depth-net-6','Networking','foundation','Which HTTP method is conventionally used to retrieve a resource?',['GET','DELETE','PATCH only','TRACE always'],0,'GET retrieves a representation/resource.',['network','http','get']),
  q('camp-depth-net-7','Networking','core','What does a router primarily do?',['Forward packets between networks','Compile source code','Create SQL tables','Schedule processes'],0,'Routers select paths/next hops between networks.',['network','router']),
  q('camp-depth-net-8','Networking','core','Latency is best described as:',['Delay for data/request traversal/response','Total data capacity only','Number of database rows','CPU instruction count'],0,'Latency measures delay, while bandwidth measures capacity/rate.',['network','latency']),
  q('camp-depth-net-9','Networking','core','A subnet mask/prefix helps determine:',['Which part of an IP address identifies the network','SQL data type','Object method visibility','Loop count'],0,'Network prefixes identify address ranges/subnets.',['network','subnet','ip']),
  q('camp-depth-net-10','Networking','core','What is the purpose of the TCP three-way handshake?',['Establish connection state and synchronize sequence information','Resolve DNS','Encrypt files directly','Create an HTTP cache entry'],0,'SYN/SYN-ACK/ACK establishes TCP connection state.',['network','tcp','handshake']),
  q('camp-depth-net-11','Networking','foundation','Which protocol commonly assigns IP configuration dynamically on a LAN?',['DHCP','HTML','SQL','SSH only'],0,'DHCP can assign IP configuration to clients.',['network','dhcp']),
  q('camp-depth-net-12','Networking','core','What does a load balancer commonly do?',['Distribute requests across multiple service instances','Replace all databases','Compile Java','Change DNS syntax'],0,'Load balancers spread traffic to healthy backends.',['network','load balancing']),

  q('camp-depth-verbal-1','Verbal communication','foundation','Choose the clearest professional sentence.',['I completed the module and documented the remaining risks.','Me completed module risks.','Module done maybe.','I was like completing things.'],0,'The first sentence is concise, grammatical, and specific.',['verbal','communication','grammar']),
  q('camp-depth-verbal-2','Verbal communication','core','When answering a technical question you do not fully understand, what is best?',['Clarify the question before answering','Pretend certainty','Change the subject','Stay silent without explanation'],0,'Clarifying prevents answering the wrong question.',['verbal','communication','interview']),
  q('camp-depth-verbal-3','Verbal communication','core','A strong project introduction should start with:',['The problem, your role, and the outcome/context','Every dependency version','A five-minute personal history','Only the project name'],0,'A concise framing helps the interviewer understand relevance quickly.',['verbal','project','communication']),
  q('camp-depth-verbal-4','Verbal communication','foundation','Which is most concise?',['The API failed because the token expired.','Due to the fact that there was an expiration condition related to the token, the API experienced failure.','API things happened.','Token maybe API.'],0,'Direct subject-cause wording is clearer.',['verbal','clarity']),
  q('camp-depth-verbal-5','Verbal communication','core','If an interviewer interrupts for clarification, you should:',['Pause and address the clarification directly','Ignore them and continue','Restart the entire interview','Argue about timing'],0,'Interactive clarification improves communication.',['verbal','interview']),
  q('camp-depth-verbal-6','Verbal communication','core','What is a useful structure for a technical explanation?',['Context → approach → tradeoff → result','Random details only','Result with no context','Only acronyms'],0,'Structured explanations are easier to follow and evaluate.',['verbal','communication']),
  q('camp-depth-verbal-7','Verbal communication','foundation','Which word best completes: “The results ___ consistent across three runs.”',['were','was','is been','be'],0,'Plural “results” takes “were” in this sentence.',['verbal','grammar']),
  q('camp-depth-verbal-8','Verbal communication','core','When discussing a team project, what should be clear?',['Your specific contribution as well as the team outcome','Only what teammates did','Only the project title','Nothing about decisions'],0,'Interviewers need to distinguish your work from the team’s work.',['verbal','project']),
  q('camp-depth-verbal-9','Verbal communication','core','What is the best response if you realize an earlier statement was wrong?',['Correct it clearly and continue','Defend it regardless','Hide the error','End the interview'],0,'Correcting yourself demonstrates accuracy and composure.',['verbal','communication']),
  q('camp-depth-verbal-10','Verbal communication','foundation','Which opening is strongest for an email requesting information?',['Could you please confirm the interview schedule for Monday?','Hey stuff?','Need info ASAP!!!','Why no response'],0,'The first is specific and professional.',['verbal','professional']),
  q('camp-depth-verbal-11','Verbal communication','core','Why avoid excessive jargon in an interview answer?',['It can obscure reasoning and exclude the listener','It always improves accuracy','It guarantees selection','It reduces all ambiguity'],0,'Use terminology when useful, but keep reasoning understandable.',['verbal','clarity']),
  q('camp-depth-verbal-12','Verbal communication','foundation','Which sentence uses subject-verb agreement correctly?',['Each candidate has a time slot.','Each candidate have a time slot.','Each candidates has slots.','Candidates has a slot.'],0,'“Each candidate” is singular, so “has” is correct.',['verbal','grammar']),

  q('camp-depth-behavior-1','Behavioral communication','foundation','In STAR, the A stands for:',['Action','Assessment','Agreement','Audience'],0,'STAR = Situation, Task, Action, Result.',['behavioral','star']),
  q('camp-depth-behavior-2','Behavioral communication','core','When describing a team conflict, what is strongest?',['Explain the disagreement, your actions, and the outcome','Blame the other person only','Say conflict never happens','Avoid your own role'],0,'A balanced answer shows judgment and collaboration.',['behavioral','teamwork']),
  q('camp-depth-behavior-3','Behavioral communication','core','When asked about a failure, what should you include?',['What you learned and changed afterward','Only excuses','A claim that you never fail','Unrelated achievements'],0,'Reflection and changed behavior make the example useful.',['behavioral','learning']),
  q('camp-depth-behavior-4','Behavioral communication','core','A strong ownership example should show:',['What you personally noticed, decided, and followed through on','Only your job title','Only team size','No outcome'],0,'Ownership is demonstrated through actions and follow-through.',['behavioral','ownership']),
  q('camp-depth-behavior-5','Behavioral communication','foundation','When discussing a project, the Result should ideally include:',['A concrete outcome or impact','Only the technologies used','Only the problem statement','No measurable effect'],0,'Results close the story with impact.',['behavioral','star','result']),
  q('camp-depth-behavior-6','Behavioral communication','core','If your team chose an approach you disagreed with, a good example should show:',['How you raised concerns constructively and supported the final decision appropriately','How you refused all work','How you hid information','How you blamed leadership'],0,'Constructive disagreement plus commitment demonstrates maturity.',['behavioral','teamwork']),
  q('camp-depth-behavior-7','Behavioral communication','core','When asked “Why this company?”, the strongest answer connects:',['Your goals/skills with specific role/company opportunities','Only salary','A generic statement usable anywhere','Nothing about the role'],0,'Specific alignment is more credible than generic enthusiasm.',['behavioral','motivation']),
  q('camp-depth-behavior-8','Behavioral communication','core','A project story is stronger when you distinguish:',['Your contribution from the team’s contribution','Nothing about roles','Only the team contribution','Only the project name'],0,'Specific ownership lets the interviewer evaluate your impact.',['behavioral','project']),
  q('camp-depth-behavior-9','Behavioral communication','foundation','What is the best way to answer a question about a weakness?',['Name a genuine development area and what you are doing about it','Claim you have none','Choose a fake strength only','Blame a teammate'],0,'A useful answer shows self-awareness and active improvement.',['behavioral','self awareness']),
  q('camp-depth-behavior-10','Behavioral communication','core','When priorities changed suddenly, a good example should show:',['How you reassessed tradeoffs and communicated changes','That you ignored the change','That you stopped all work','Only frustration'],0,'Adaptability includes reprioritization and communication.',['behavioral','adaptability']),
  q('camp-depth-behavior-11','Behavioral communication','core','If you made a mistake that affected others, what should the story emphasize?',['Owning it, fixing impact, and preventing recurrence','Hiding it','Finding someone else to blame','Avoiding the result'],0,'Accountability includes correction and prevention.',['behavioral','ownership']),
  q('camp-depth-behavior-12','Behavioral communication','foundation','Why prepare concise examples before an interview?',['They help you answer with evidence rather than vague claims','They guarantee every question repeats','They remove the need to listen','They replace technical preparation'],0,'Prepared examples improve specificity while still requiring adaptation to the question.',['behavioral','interview']),
]

export function buildCampusDepthBank() {
  return [...quantitativeQuestions(), ...logicalQuestions(), ...fixed]
}
