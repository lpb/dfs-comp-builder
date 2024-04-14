for file in *; do 
    if [ -f "$file" ]; then 
        printf '\x23' | dd of=$file bs=1 seek=262 count=1 conv=notrunc
    fi 
done