# logic
- all answers should have the sources ans more on this topic?

# the main plan: 
1. do the cypress tests
2. make sure the automation works fine 
3. build an Internal Rag with specific conditions (which get from cypress) to check if the answer from the main rag its correct
4. connect the cypress with the internal rag (once the evaluate_rag.js gets new files should run and give the answer) 
5. improve the internal prompt to suit the tests. 

# test_1
- Basic user ask a vague query: "Angular Signals"
- user can get general content related to Angular OR: user could be asked to clairfy the question 
- The assistant must ensure that “Angular Signals” is interpreted as a technical/software term only
- the answer should be in english as its an english question (no fallback)
- how to create a basic user without sandsmedia domains and unlimited???

# test_2
- FS user asks "Conference sessions on Angular 20"
- the assistant should recognize is a FS user and gives a premium content such as WSs or sessions
- It may prioritize content related to angular based on tags or platform metadata
- the answer should include a short intro, bullet or numbered list of sessions (title, speaker,,etc), summary and more in this topic
- citation
- respect the document's content type and access roles
- how to create a FS user without sandsmedia domains and unlimited??????

# test_3
- non-tier user asks: "Docker tutorial"
- the Assistant detects that the user has no active access tier. 
- should get upgrade message. 
- english question = english answer. 

# test_4 ask for the events in egypt (non internal events)
- the result: 
1. 

# ask a general question about JAVA script 